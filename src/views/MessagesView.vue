<template>
    <div class="messages-page">
        <div class="messages-layout" :class="{ 'has-active': !!store.activeConversationId }">
            <div class="list-pane">
                <ConversationList @select="onSelect" />
            </div>

            <div class="thread-pane">
                <ConversationView v-if="store.activeConversationId" @back="onBack" />
                <div v-else class="placeholder">
                    <p>Select a conversation</p>
                </div>
            </div>
        </div>

        <BottomNav />
    </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useMessagesStore } from '../stores/messages';
import BottomNav from '../components/BottomNav.vue';
import ConversationList from '../components/messages/ConversationList.vue';
import ConversationView from '../components/messages/ConversationView.vue';

const store = useMessagesStore();

function onSelect() {
    // On mobile the layout switches to the thread automatically via has-active.
}

function onBack() {
    store.closeConversation();
}

onMounted(() => {
    store.init();
});

onUnmounted(() => {
    // Leave the active room but keep socket listeners alive so the unread badge
    // continues to update from elsewhere in the app.
    store.closeConversation();
});
</script>

<style scoped>
.messages-page {
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    padding-bottom: 70px;
    background: var(--bg-main);
}

.messages-layout {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(300px, 380px) 1fr;
}

.list-pane {
    min-height: 0;
    overflow: hidden;
}

.thread-pane {
    min-height: 0;
    overflow: hidden;
    background: var(--bg-main);
}

.placeholder {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-subtle);
    text-align: center;
    padding: 24px;
}

.placeholder p {
    margin: 0;
    font-size: 0.9rem;
}

/* Single-pane on mobile: show the list, or the thread when one is open. */
@media (max-width: 760px) {
    .messages-layout {
        grid-template-columns: 1fr;
    }

    .thread-pane {
        display: none;
    }

    .messages-layout.has-active .list-pane {
        display: none;
    }

    .messages-layout.has-active .thread-pane {
        display: block;
    }
}
</style>
