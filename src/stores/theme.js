import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
    const isDark = ref(false);

    const toggleTheme = () => {
        isDark.value = !isDark.value;

        if (!isDark.value) {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
        }
    }

    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme');

        if (savedTheme === 'dark') {
            isDark.value = true;
            document.documentElement.removeAttribute('data-theme');
        } else {
            isDark.value = false;
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }

    return { isDark, toggleTheme, initTheme };
})