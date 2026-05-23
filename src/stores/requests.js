import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useRequestStore = defineStore('requests', () => {
    const activeRequest = ref(null);

    function setActiveRequest(req) {
        activeRequest.value = req;
    }

    function clearActiveRequest() {
        activeRequest.value = null;
    }

    return { activeRequest, setActiveRequest, clearActiveRequest };
});
