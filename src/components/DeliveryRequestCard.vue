<template>
    <div class="request-card">
        <div class="details">
            <div class="header">
                <span class="item-name">ORDER ITEM</span>
                <span class="vendor-tag">VENDOR</span>
            </div>

            <div class="location-info">
                <p><strong>From: </strong>SOURCE</p>
                <p><strong>To: </strong><span class="highlight">DESTINATION</span></p>
            </div>
        </div>

        <div class="actions">
            <div class="tokens">
                <span class="star">★</span> XXX Tokens
            </div>
            <button class="accept-btn">Accept</button>
        </div>
    </div>
</template>

<style scoped>
.request-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.item-name {
    font-size: 1.1rem;
    font-weight: bold;
    color: var(--text-main);
}

.vendor-tag {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    font-size: 0.7rem;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
}

.location-info p {
    margin: 4px 0;
    font-size: 0.9rem;
    color: var(--text-muted);
}

.highlight {
    color: #10b981;
    font-weight: 600;
}

.actions {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.tokens {
    font-weight: bold;
    font-size: 1.1rem;
    color: #fbbf24;
}

.accept-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
}

@media (max-width: 600px) {
    .request-card {
        flex-direction: column;
        align-items: flex-start;
    }

    .actions {
        width: 100%;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border-color);
    }
}
</style>