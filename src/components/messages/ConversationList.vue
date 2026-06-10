<template>
    <aside class="conv-list" aria-label="Conversations">
        <header class="list-header">
            <h1 class="list-title">Messages</h1>
        </header>

        <div class="search-wrap">
            <i class="pi pi-search search-icon" aria-hidden="true"></i>
            <input
                v-model="query"
                type="search"
                class="search-input"
                placeholder="Search conversations"
                aria-label="Search conversations"
            />
        </div>

        <div class="list-body">
            <div v-if="store.conversationsLoading && !store.conversations.length" class="state">
                <i class="pi pi-spin pi-spinner"></i>
                <span>Loading conversations…</span>
            </div>

            <div v-else-if="store.conversationsError" class="state error" role="alert">
                <i class="pi pi-exclamation-circle"></i>
                <span>{{ store.conversationsError }}</span>
                <button class="retry" @click="store.loadConversations()">Retry</button>
            </div>

            <div v-else-if="!store.conversations.length" class="state subtle">
                <span>No conversations yet</span>
            </div>

            <div v-else-if="!filtered.length" class="state subtle">
                <span>No results</span>
            </div>

            <ul v-else class="rows" role="list">
                <li v-for="c in filtered" :key="c.id" role="listitem">
                    <button
                        class="row"
                        :class="{ active: c.id === store.activeConversationId }"
                        :aria-current="c.id === store.activeConversationId ? 'true' : undefined"
                        @click="select(c.id)"
                    >
                        <div class="avatar">
                            <img v-if="avatar(c)" :src="avatar(c)" alt="" class="avatar-img" />
                            <i v-else class="pi pi-user"></i>
                            <span class="presence-dot" :class="{ on: store.isUserOnline(c.otherUser.id) }"></span>
                        </div>

                        <div class="row-main">
                            <div class="row-top">
                                <span class="row-name">{{ c.otherUser.name }}</span>
                                <span class="row-time">{{ formatTime(c.lastMessage?.createdAt) }}</span>
                            </div>
                            <div class="row-bottom">
                                <span class="row-preview">{{ preview(c) }}</span>
                                <span v-if="c.unreadCount" class="unread" :aria-label="`${c.unreadCount} unread`">
                                    {{ c.unreadCount > 99 ? '99+' : c.unreadCount }}
                                </span>
                            </div>
                        </div>
                    </button>
                </li>
            </ul>
        </div>
    </aside>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useMessagesStore } from '../../stores/messages';
import { useAuthStore } from '../../stores/auth';
import { resolveFileUrl } from '../../utils/fileUrl';

const emit = defineEmits(['select']);

const store = useMessagesStore();
const auth = useAuthStore();
const query = ref('');

const filtered = computed(() => {
    const q = query.value.trim().toLowerCase();
    if (!q) return store.conversations;
    return store.conversations.filter((c) => c.otherUser.name?.toLowerCase().includes(q));
});

function avatar(c) {
    return resolveFileUrl(c.otherUser.pfpUrl);
}

function preview(c) {
    if (!c.lastMessage) return 'No messages yet';
    const mine = c.lastMessage.senderId === auth.user?.id;
    const text = c.lastMessage.body || (c.lastMessage.imageUrl ? 'Photo' : '');
    return `${mine ? 'You: ' : ''}${text}`;
}

function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const days = Math.round((now - d) / 86400000);
    if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function select(id) {
    store.openConversation(id);
    emit('select', id);
}
</script>

<style scoped>
.conv-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-color);
}

.list-header {
    padding: 18px 18px 8px;
}

.list-title {
    margin: 0;
    font-family: 'Montserrat', sans-serif;
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-main);
    letter-spacing: -0.02em;
}

.search-wrap {
    position: relative;
    padding: 4px 16px 12px;
}

.search-icon {
    position: absolute;
    left: 28px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-subtle);
    font-size: 0.85rem;
    margin-top: -4px;
}

.search-input {
    width: 100%;
    border: 1px solid var(--border-color);
    background: var(--bg-input);
    color: var(--text-main);
    border-radius: 14px;
    padding: 10px 14px 10px 36px;
    font-family: 'Inter', sans-serif;
    font-size: 0.88rem;
}

.search-input:focus {
    outline: none;
    border-color: var(--theme-blue);
    box-shadow: 0 0 0 3px rgba(0, 101, 201, 0.18);
}

.list-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.rows {
    list-style: none;
    margin: 0;
    padding: 0;
}

.row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    min-height: 64px;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--divider-color);
    cursor: pointer;
    text-align: left;
    transition: background 0.12s ease;
}

.row:hover {
    background: var(--bg-input);
}

.row.active {
    background: var(--bg-input);
}

.row:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--theme-blue);
}

.avatar {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 1.2rem;
    flex-shrink: 0;
}

.avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.presence-dot {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--text-subtle);
    border: 2px solid var(--bg-surface);
}

.presence-dot.on {
    background: var(--color-success);
}

.row-main {
    flex: 1;
    min-width: 0;
}

.row-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
}

.row-name {
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.row-time {
    font-size: 0.72rem;
    color: var(--text-subtle);
    flex-shrink: 0;
}

.row-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
}

.row-preview {
    font-family: 'Inter', sans-serif;
    font-size: 0.84rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.unread {
    flex-shrink: 0;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 10px;
    background: var(--color-accent);
    color: #fff;
    font-size: 0.72rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
}

.state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 48px 24px;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9rem;
}

.state i {
    font-size: 1.8rem;
}

.state.error {
    color: var(--color-error);
}

.state.subtle {
    color: var(--text-subtle);
}

.retry {
    margin-top: 4px;
    border: 1px solid var(--border-color);
    background: var(--bg-card);
    color: var(--text-main);
    border-radius: 18px;
    padding: 6px 16px;
    cursor: pointer;
    font-size: 0.82rem;
}
</style>
