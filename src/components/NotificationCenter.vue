<template>
  <Teleport to="body">
    <Transition name="nc-fade">
      <div v-if="visible" class="nc-backdrop" @click.self="close">
        <Transition name="nc-sheet" appear>
          <section
            v-if="visible"
            class="nc-sheet"
            role="dialog"
            aria-label="Notifications"
            :style="sheetStyle"
            @touchstart.passive="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
            @touchcancel="onTouchEnd"
          >
            <div class="nc-grabber" @click="close"></div>

            <header class="nc-head">
              <h2>Notifications</h2>
              <button
                v-if="store.unreadCount > 0"
                class="nc-textbtn"
                @click="store.markAllRead()"
              >
                Mark all read
              </button>
            </header>

            <div v-if="showEnable" class="nc-enable">
              <div class="nc-enable-icon"><i class="pi pi-bell"></i></div>
              <div class="nc-enable-copy">
                <p class="nc-enable-title">Turn on notifications</p>
                <p class="nc-enable-sub">{{ enableHint }}</p>
              </div>
              <button
                v-if="store.permission !== 'denied'"
                class="nc-pill"
                :disabled="store.busy"
                @click="enable"
              >
                {{ store.busy ? 'Turning on…' : 'Turn on' }}
              </button>
            </div>

            <div class="nc-body">
              <ul v-if="store.items.length" class="nc-list">
                <li
                  v-for="n in store.items"
                  :key="n.id"
                  class="nc-item"
                  :class="{ unread: !n.read }"
                  @click="openItem(n)"
                >
                  <span class="nc-item-icon" :class="`t-${iconFor(n.type).tone}`">
                    <i :class="`pi ${iconFor(n.type).icon}`"></i>
                  </span>
                  <span class="nc-item-main">
                    <span class="nc-item-title">{{ n.title }}</span>
                    <span v-if="n.body" class="nc-item-body">{{ n.body }}</span>
                    <span class="nc-item-time">{{ relTime(n.createdAt) }}</span>
                  </span>
                  <span v-if="!n.read" class="nc-dot"></span>
                </li>

                <li v-if="store.hasMore" class="nc-more">
                  <button class="nc-textbtn" :disabled="store.loading" @click="store.loadMore()">
                    {{ store.loading ? 'Loading…' : 'Show older' }}
                  </button>
                </li>
              </ul>

              <div v-else-if="store.loading" class="nc-empty">
                <i class="pi pi-spin pi-spinner"></i>
              </div>

              <div v-else class="nc-empty">
                <div class="nc-empty-glyph"><i class="pi pi-bell-slash"></i></div>
                <p class="nc-empty-title">You're all caught up</p>
                <p class="nc-empty-sub">Order updates will land here.</p>
              </div>
            </div>

            <footer v-if="showToggle" class="nc-foot">
              <span class="nc-foot-label">Push on this device</span>
              <button
                class="nc-switch"
                :class="{ on: store.pushEnabled }"
                :disabled="store.busy"
                role="switch"
                :aria-checked="store.pushEnabled"
                @click="togglePush"
              >
                <span class="nc-switch-knob"></span>
              </button>
            </footer>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useNotificationsStore } from '../stores/notifications';
import { pushFailureReason } from '../utils/push';

const visible = defineModel('visible', { default: false });

const store = useNotificationsStore();
const router = useRouter();
const toast = useToast();

const showEnable = computed(() => store.supported && store.permission !== 'granted');

//once permission is granted the opt-in card is gone, so the footer switch
//becomes the place to turn this device's push on or off
const showToggle = computed(() => store.supported && store.permission === 'granted');

const enableHint = computed(() => {
  if (store.permission === 'denied') return 'Blocked — re-enable in your browser settings.';
  return 'Get order updates and messages, even when CampusDash is closed.';
});

//load lazily the first time the sheet is opened, and re-check this device's push
//state each open in case it changed in another tab
watch(visible, (open) => {
  if (!open) return;
  dragY.value = 0;
  if (!store.loaded) store.load();
  store.refreshPushState();
});

//drag-to-dismiss: follow the finger down, snap back if the pull was small,
//keep sliding out if it crossed the threshold
const DISMISS_AFTER = 96;
const dragY = ref(0);
const dragging = ref(false);
let startY = 0;
let atTop = false;

const sheetStyle = computed(() => {
  if (!dragY.value) return {};
  return {
    transform: `translateY(${dragY.value}px)`,
    transition: dragging.value ? 'none' : 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
  };
});

function onTouchStart(e) {
  if (e.touches.length !== 1) return;
  startY = e.touches[0].clientY;
  const body = e.currentTarget.querySelector('.nc-body');
  atTop = !body || body.scrollTop <= 0;
  dragging.value = true;
}

function onTouchMove(e) {
  if (!dragging.value) return;
  const delta = e.touches[0].clientY - startY;
  //only take over the gesture while pulling down from the top of the list,
  //otherwise let the body scroll normally
  if (delta > 0 && atTop) {
    dragY.value = delta;
    e.preventDefault();
  } else {
    dragY.value = 0;
  }
}

function onTouchEnd() {
  if (!dragging.value) return;
  dragging.value = false;
  if (dragY.value > DISMISS_AFTER) {
    dragY.value = window.innerHeight;
    setTimeout(close, 260);
  } else {
    dragY.value = 0;
  }
}

function close() {
  visible.value = false;
}

async function enable() {
  await runEnable();
}

async function togglePush() {
  if (store.pushEnabled) {
    await store.disable();
    return;
  }
  await runEnable();
}

async function runEnable() {
  const result = await store.enable();
  if (result === 'granted' && store.pushEnabled) {
    toast.add({ severity: 'success', summary: 'Notifications on', detail: 'This device will get push alerts.', life: 3000 });
  } else if (result === 'denied') {
    toast.add({ severity: 'warn', summary: 'Notifications blocked', detail: 'Allow notifications for this site in your browser settings.', life: 5000 });
  } else {
    toast.add({
      severity: 'warn',
      summary: 'Push not available here',
      detail: pushFailureReason(result, store.lastError),
      life: 9000,
    });
  }
}

const TYPE_ICONS = {
  request_accepted: { icon: 'pi-check-circle', tone: 'green' },
  request_collected: { icon: 'pi-shopping-bag', tone: 'blue' },
  request_completed: { icon: 'pi-flag-fill', tone: 'green' },
  request_cancelled: { icon: 'pi-times-circle', tone: 'red' },
  system: { icon: 'pi-info-circle', tone: 'accent' },
};

function iconFor(type) {
  return TYPE_ICONS[type] || { icon: 'pi-bell', tone: 'accent' };
}

function openItem(n) {
  if (!n.read) store.markRead([n.id]);
  const url = n.data?.url;
  close();
  if (url) router.push(url).catch(() => {});
}

function relTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 45) return 'Just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
</script>

<style scoped>
.nc-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.nc-sheet {
  width: min(520px, 100%);
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-bottom: none;
  border-radius: 28px 28px 0 0;
  box-shadow: 0 -18px 50px rgba(0, 0, 0, 0.32);
  padding: 6px 0 max(14px, env(safe-area-inset-bottom));
  overflow: hidden;
}

.nc-grabber {
  width: 38px;
  height: 5px;
  border-radius: 3px;
  background: var(--text-subtle);
  opacity: 0.5;
  margin: 8px auto 4px;
  cursor: pointer;
}

.nc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px 12px;
}

.nc-head h2 {
  margin: 0;
  font-family: 'Montserrat', sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-main);
}

.nc-textbtn {
  background: none;
  border: none;
  color: var(--theme-blue);
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 2px;
}

.nc-textbtn:disabled {
  opacity: 0.5;
  cursor: default;
}

.nc-enable {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 14px 8px;
  padding: 12px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 18px;
}

.nc-enable-icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  color: var(--color-accent);
  font-size: 1.05rem;
}

.nc-enable-copy {
  flex: 1;
  min-width: 0;
}

.nc-enable-title {
  margin: 0;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text-main);
}

.nc-enable-sub {
  margin: 2px 0 0;
  font-family: 'Inter', sans-serif;
  font-size: 0.74rem;
  color: var(--text-muted);
  line-height: 1.3;
}

.nc-pill {
  flex-shrink: 0;
  border: none;
  border-radius: 18px;
  padding: 8px 14px;
  background: var(--theme-blue);
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease, opacity 0.2s ease;
}

.nc-pill:active {
  transform: scale(0.95);
}

.nc-pill:disabled {
  opacity: 0.6;
  cursor: default;
}

.nc-body {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 12px;
}

.nc-list {
  list-style: none;
  margin: 0;
  padding: 2px 0 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nc-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: background 0.18s ease;
}

.nc-item:active {
  background: var(--bg-input);
}

.nc-item.unread {
  background: color-mix(in srgb, var(--theme-blue) 8%, transparent);
}

.nc-item-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 1.05rem;
}

.nc-item-icon.t-green {
  background: color-mix(in srgb, var(--color-success) 16%, transparent);
  color: var(--color-success);
}

.nc-item-icon.t-blue {
  background: color-mix(in srgb, var(--theme-blue) 16%, transparent);
  color: var(--theme-blue);
}

.nc-item-icon.t-red {
  background: color-mix(in srgb, var(--color-error) 16%, transparent);
  color: var(--color-error);
}

.nc-item-icon.t-accent {
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  color: var(--color-accent);
}

.nc-item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.nc-item-title {
  font-family: 'Montserrat', sans-serif;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.nc-item-body {
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.35;
}

.nc-item-time {
  font-family: 'Inter', sans-serif;
  font-size: 0.68rem;
  color: var(--text-subtle);
  margin-top: 2px;
}

.nc-dot {
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--theme-blue);
}

.nc-more {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
}

.nc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 48px 20px 56px;
  color: var(--text-muted);
}

.nc-empty-glyph {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--bg-input);
  color: var(--text-subtle);
  font-size: 1.4rem;
  margin-bottom: 4px;
}

.nc-empty-title {
  margin: 0;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 0.94rem;
  color: var(--text-main);
}

.nc-empty-sub {
  margin: 0;
  font-family: 'Inter', sans-serif;
  font-size: 0.8rem;
}

.nc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 6px 14px 0;
  padding: 14px 4px 4px;
  border-top: 1px solid var(--divider-color);
}

.nc-foot-label {
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-main);
}

.nc-switch {
  position: relative;
  width: 46px;
  height: 28px;
  border-radius: 14px;
  border: none;
  background: var(--text-subtle);
  cursor: pointer;
  padding: 0;
  transition: background 0.24s ease;
}

.nc-switch.on {
  background: var(--color-success);
}

.nc-switch:disabled {
  opacity: 0.6;
  cursor: default;
}

.nc-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.24s cubic-bezier(0.32, 0.72, 0, 1);
}

.nc-switch.on .nc-switch-knob {
  transform: translateX(18px);
}

/*apple-style sheet motion: fast in, gentle settle*/
.nc-fade-enter-active,
.nc-fade-leave-active {
  transition: opacity 0.28s ease;
}

.nc-fade-enter-from,
.nc-fade-leave-to {
  opacity: 0;
}

.nc-sheet-enter-active {
  transition: transform 0.42s cubic-bezier(0.32, 0.72, 0, 1);
}

.nc-sheet-leave-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.nc-sheet-enter-from,
.nc-sheet-leave-to {
  transform: translateY(100%);
}
</style>
