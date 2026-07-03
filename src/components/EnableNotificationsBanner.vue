<template>
  <Transition name="enb-drop">
    <div v-if="show" class="enb">
      <span class="enb-icon"><i class="pi pi-bell"></i></span>
      <p class="enb-copy">Stay in the loop — get pinged on order updates and messages.</p>
      <div class="enb-actions">
        <button class="enb-ghost" @click="dismiss">Not now</button>
        <button class="enb-solid" :disabled="store.busy" @click="turnOn">
          {{ store.busy ? '…' : 'Turn on' }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useNotificationsStore } from '../stores/notifications';

const DISMISS_KEY = 'cd_notif_prompt_dismissed';

const store = useNotificationsStore();
const dismissed = ref(true);

//only nudge when this device can actually do push and the user hasn't decided
//yet — never re-ask once granted, blocked, or explicitly waved off
const show = computed(
  () => !dismissed.value && store.supported && store.permission === 'default'
);

onMounted(() => {
  dismissed.value = localStorage.getItem(DISMISS_KEY) === '1';
  store.refreshPushState();
});

function dismiss() {
  dismissed.value = true;
  localStorage.setItem(DISMISS_KEY, '1');
}

async function turnOn() {
  await store.enable();
  //granting flips permission away from 'default', which hides the banner on its
  //own; a decline just leaves it for next session unless they dismiss
  if (store.permission !== 'default') localStorage.setItem(DISMISS_KEY, '1');
}
</script>

<style scoped>
.enb {
  position: absolute;
  top: 78px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1200;
  width: min(440px, calc(100% - 28px));
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
  pointer-events: auto;
}

.enb-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  color: var(--color-accent);
  font-size: 1rem;
}

.enb-copy {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: 'Inter', sans-serif;
  font-size: 0.76rem;
  line-height: 1.3;
  color: var(--text-main);
}

.enb-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.enb-ghost {
  border: none;
  background: none;
  color: var(--text-muted);
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 6px;
}

.enb-solid {
  border: none;
  border-radius: 16px;
  padding: 7px 14px;
  background: var(--theme-blue);
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.enb-solid:active {
  transform: scale(0.94);
}

.enb-solid:disabled {
  opacity: 0.6;
}

.enb-drop-enter-active {
  transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease;
}

.enb-drop-leave-active {
  transition: transform 0.28s ease, opacity 0.24s ease;
}

.enb-drop-enter-from,
.enb-drop-leave-to {
  opacity: 0;
  transform: translate(-50%, -14px);
}
</style>
