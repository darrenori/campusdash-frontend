//reads a nusmods share link and works out where you're headed next.
//runs in the browser and only ever hits the fixed nusmods host, so a pasted
//link can't point our fetches anywhere else.

const NUSMODS_API_HOST = 'https://api.nusmods.com/v2';

//don't choke on junk or spammy links
const MAX_MODULES = 20;
const MODULE_CODE_PATTERN = /^[A-Z]{2,4}\d{4}[A-Z]{0,3}$/;
const CLASS_NO_PATTERN = /^[A-Z0-9]{1,4}$/;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

//full lesson name to the short form nusmods puts in the url
const LESSON_TYPE_ABBREV = {
    'Design Lecture': 'DLEC',
    'Laboratory': 'LAB',
    'Lecture': 'LEC',
    'Packaged Lecture': 'PLEC',
    'Packaged Tutorial': 'PTUT',
    'Recitation': 'REC',
    'Sectional Teaching': 'SEC',
    'Seminar-Style Module Class': 'SEM',
    'Tutorial': 'TUT',
    'Tutorial Type 2': 'TUT2',
    'Tutorial Type 3': 'TUT3',
    'Workshop': 'WS',
};

//nus acad year rolls over in august
export const getAcadYear = (date = new Date()) => {
    const year = date.getFullYear();
    const startYear = date.getMonth() + 1 >= 8 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
};

//"1400" to 840 mins, or null if it's junk
const timeToMinutes = (value) => {
    if (typeof value !== 'string' || !/^\d{4}$/.test(value)) return null;
    const hours = Number(value.slice(0, 2));
    const minutes = Number(value.slice(2));
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
};

export const formatLessonTime = (value) => {
    const minutes = timeToMinutes(value);
    if (minutes === null) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours < 12 ? 'AM' : 'PM';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${String(mins).padStart(2, '0')} ${period}`;
};

//venues look like COM1-0201; our locations key off the building bit before the dash
const toBuildingCode = (venue) => {
    if (typeof venue !== 'string') return '';
    return venue.split('-')[0].trim().toUpperCase();
};

//pull the semester and picked modules out of the share link
export const parseShareUrl = (rawUrl) => {
    let url;
    try {
        url = new URL(String(rawUrl).trim());
    } catch {
        throw new Error('That doesn\'t look like a valid link.');
    }

    if (!/(^|\.)nusmods\.com$/i.test(url.hostname)) {
        throw new Error('Please paste a nusmods.com timetable share link.');
    }

    const semMatch = url.pathname.match(/sem-(\d)/i);
    if (!semMatch) {
        throw new Error('Couldn\'t find a semester in that link.');
    }
    const semester = Number(semMatch[1]);

    const modules = [];
    for (const [rawCode, rawValue] of url.searchParams.entries()) {
        const code = rawCode.trim().toUpperCase();
        if (!MODULE_CODE_PATTERN.test(code)) continue;
        if (modules.some((m) => m.code === code)) continue;

        const selections = [];
        for (const part of (rawValue || '').split(',')) {
            const idx = part.indexOf(':');
            if (idx === -1) continue;
            const lessonType = part.slice(0, idx).trim().toUpperCase();
            const classNo = part.slice(idx + 1).trim();
            if (!lessonType || !CLASS_NO_PATTERN.test(classNo.toUpperCase())) continue;
            selections.push({ lessonType, classNo });
        }

        //nothing picked (e.g. CFG1002=) means no venue to work with
        if (selections.length) modules.push({ code, selections });
        if (modules.length >= MAX_MODULES) break;
    }

    if (!modules.length) {
        throw new Error('No timetable slots found in that link.');
    }

    return { semester, modules };
};

const fetchModule = async (acadYear, code) => {
    //code is already validated by the time we get here
    const res = await fetch(`${NUSMODS_API_HOST}/${acadYear}/modules/${encodeURIComponent(code)}.json`);
    if (!res.ok) return null;
    return res.json();
};

const findLocationCoords = (buildingCode, locations = []) => {
    if (!buildingCode) return null;
    const match = locations.find((loc) => String(loc.code || '').toUpperCase() === buildingCode);
    if (!match?.coords) return null;
    const { lat, lng } = match.coords;
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

//fetch every module and flatten the picked slots into a plain list of venues.
//locations is the /locations payload, used to tag on coordinates.
export const resolveTimetable = async (rawUrl, locations = []) => {
    const { semester, modules } = parseShareUrl(rawUrl);
    const acadYear = getAcadYear();

    const moduleData = await Promise.all(
        modules.map(async (mod) => {
            try {
                return { mod, data: await fetchModule(acadYear, mod.code) };
            } catch {
                return { mod, data: null };
            }
        })
    );

    const lessons = [];
    for (const { mod, data } of moduleData) {
        const semesterData = data?.semesterData?.find((s) => s.semester === semester);
        const timetable = semesterData?.timetable;
        if (!Array.isArray(timetable)) continue;

        for (const { lessonType, classNo } of mod.selections) {
            const slots = timetable.filter(
                (slot) =>
                    LESSON_TYPE_ABBREV[slot.lessonType] === lessonType &&
                    String(slot.classNo) === classNo
            );

            for (const slot of slots) {
                if (!DAYS.includes(slot.day) || timeToMinutes(slot.startTime) === null) continue;
                const venueCode = toBuildingCode(slot.venue);
                lessons.push({
                    moduleCode: mod.code,
                    lessonType,
                    day: slot.day,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    venue: slot.venue || '',
                    venueCode,
                    coords: findLocationCoords(venueCode, locations),
                });
            }
        }
    }

    if (!lessons.length) {
        throw new Error('Couldn\'t resolve any class venues from that timetable.');
    }

    return { savedAt: new Date().toISOString(), acadYear, semester, lessons };
};

//where are they now, or headed next. a class in progress wins, otherwise the
//soonest one coming up. doesn't care which week of the sem it is.
export const computeNextLocation = (lessons = [], now = new Date()) => {
    if (!Array.isArray(lessons) || !lessons.length) return null;

    const nowDay = now.getDay();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let best = null;
    for (const lesson of lessons) {
        const dayIndex = DAYS.indexOf(lesson.day);
        const start = timeToMinutes(lesson.startTime);
        const end = timeToMinutes(lesson.endTime);
        if (dayIndex === -1 || start === null) continue;

        const dayOffset = (dayIndex - nowDay + 7) % 7;
        const ongoing = dayOffset === 0 && end !== null && start <= nowMinutes && nowMinutes < end;

        //minutes until it starts; an ongoing class sorts ahead of everything
        let untilStart;
        if (ongoing) {
            untilStart = -1;
        } else if (dayOffset === 0 && start <= nowMinutes) {
            continue; //already done for today
        } else {
            untilStart = dayOffset * 1440 + start - nowMinutes;
        }

        if (!best || untilStart < best.untilStart) {
            best = { ...lesson, ongoing, untilStart };
        }
    }

    return best;
};

//rough distance in metres, plenty accurate across a campus
export const distanceMeters = (a, b) => {
    if (!a || !b) return Infinity;
    const R = 6371000;
    const rad = Math.PI / 180;
    const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
    const y = (b.lat - a.lat) * rad;
    return Math.sqrt(x * x + y * y) * R;
};

//the stored timetable lives on the user record; pull the lessons out safely
export const timetableLessons = (user) => {
    const lessons = user?.nusmods_timetable?.lessons;
    return Array.isArray(lessons) ? lessons : null;
};
