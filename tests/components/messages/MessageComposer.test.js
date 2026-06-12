import { mount, flushPromises } from '@vue/test-utils';
import MessageComposer from '../../../src/components/messages/MessageComposer.vue';

//mocks
const mockToastAdd = jest.fn();
jest.mock('primevue/usetoast', () => ({
    useToast: () => ({ add: mockToastAdd }),
}));

//swap the real pinia stores for plain stubs so the composer is tested in isolation
const mockStore = {
    sendMessage: jest.fn(),
    sendImage: jest.fn(),
    sendTyping: jest.fn(),
    sendStopTyping: jest.fn(),
    lastError: null,
};
jest.mock('../../../src/stores/messages', () => ({
    useMessagesStore: () => mockStore,
}));

//keep the socket import inert (messages store pulls it in at module load)
jest.mock('../../../src/utils/socket.js', () => ({
    getSocket: () => ({ on: jest.fn(), off: jest.fn(), emit: jest.fn() }),
}));

//helpers
function mountComposer(props = {}) {
    return mount(MessageComposer, {
        props: { conversationId: 7, ...props },
    });
}

function pngFile(name = 'photo.png') {
    return new File(['x'], name, { type: 'image/png' });
}

//attach a file list to the hidden input then fire the change handler
async function pickFile(wrapper, file) {
    const input = wrapper.find('input[type="file"]');
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
    await input.trigger('change');
}

describe('MessageComposer.vue', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockStore.lastError = null;
        mockStore.sendMessage.mockResolvedValue({});
        mockStore.sendImage.mockResolvedValue({});
        //jsdom has no object URL impl
        global.URL.createObjectURL = jest.fn(() => 'blob:preview');
        global.URL.revokeObjectURL = jest.fn();
    });

    //rendering
    describe('rendering', () => {
        it('renders the QR, attach and send buttons', () => {
            const wrapper = mountComposer();
            expect(wrapper.find('.qr-btn').exists()).toBe(true);
            expect(wrapper.find('.attach-btn').exists()).toBe(true);
            expect(wrapper.find('.send-btn').exists()).toBe(true);
        });

        it('puts the QR button to the left of the image button', () => {
            const wrapper = mountComposer();
            const buttons = wrapper.findAll('.composer-row button');
            const qrIdx = buttons.findIndex((b) => b.classes().includes('qr-btn'));
            const attachIdx = buttons.findIndex((b) => b.classes().includes('attach-btn'));
            expect(qrIdx).toBeLessThan(attachIdx);
        });

        it('disables the send button while the draft is empty', () => {
            const wrapper = mountComposer();
            expect(wrapper.find('.send-btn').attributes('disabled')).toBeDefined();
        });

        it('shows the default placeholder when nothing is staged', () => {
            const wrapper = mountComposer();
            expect(wrapper.find('.composer-input').attributes('placeholder')).toBe('Message');
        });
    });

    //paynow qr overlay, shows the OTHER participant's qr so you can pay them
    describe('PayNow QR button', () => {
        const peerWithQr = { id: 2, name: 'Bob', paynowQrUrl: '/uploads/qr.png' };
        const peerNoQr = { id: 2, name: 'Bob', paynowQrUrl: null };

        it('toasts when the peer has no QR and keeps the overlay closed', async () => {
            const wrapper = mountComposer({ peer: peerNoQr });

            await wrapper.find('.qr-btn').trigger('click');

            expect(mockToastAdd).toHaveBeenCalledWith(
                expect.objectContaining({ summary: 'No QR code uploaded yet' })
            );
            expect(wrapper.find('.qr-overlay').exists()).toBe(false);
        });

        it("opens the sheet with the peer's resolved QR image", async () => {
            const wrapper = mountComposer({ peer: peerWithQr });

            await wrapper.find('.qr-btn').trigger('click');

            const img = wrapper.find('.qr-image');
            expect(img.exists()).toBe(true);
            expect(img.attributes('src')).toBe('http://localhost:9000/uploads/qr.png');
            expect(mockToastAdd).not.toHaveBeenCalled();
        });

        it('titles the sheet with the peer name', async () => {
            const wrapper = mountComposer({ peer: peerWithQr });
            await wrapper.find('.qr-btn').trigger('click');
            expect(wrapper.find('.qr-title').text()).toBe('Pay Bob');
        });

        it('closes the sheet from the Done button', async () => {
            const wrapper = mountComposer({ peer: peerWithQr });

            await wrapper.find('.qr-btn').trigger('click');
            await wrapper.find('.qr-done').trigger('click');

            expect(wrapper.find('.qr-overlay').exists()).toBe(false);
        });

        it('closes the sheet when the backdrop itself is clicked', async () => {
            const wrapper = mountComposer({ peer: peerWithQr });

            await wrapper.find('.qr-btn').trigger('click');
            await wrapper.find('.qr-overlay').trigger('click');

            expect(wrapper.find('.qr-overlay').exists()).toBe(false);
        });
    });

    //draft + typing
    describe('draft handling', () => {
        it('enables the send button once non-blank text is entered', async () => {
            const wrapper = mountComposer();
            await wrapper.find('.composer-input').setValue('hi');
            expect(wrapper.find('.send-btn').attributes('disabled')).toBeUndefined();
        });

        it('keeps send disabled for whitespace-only text', async () => {
            const wrapper = mountComposer();
            await wrapper.find('.composer-input').setValue('   ');
            expect(wrapper.find('.send-btn').attributes('disabled')).toBeDefined();
        });

        it('emits a typing signal on the first keystroke', async () => {
            const wrapper = mountComposer();
            await wrapper.find('.composer-input').setValue('yo');
            expect(mockStore.sendTyping).toHaveBeenCalledWith(7);
        });

        it('disables both input and send when the disabled prop is set', () => {
            const wrapper = mountComposer({ disabled: true });
            expect(wrapper.find('.composer-input').attributes('disabled')).toBeDefined();
            expect(wrapper.find('.send-btn').attributes('disabled')).toBeDefined();
        });
    });

    //sending text
    describe('sending text', () => {
        it('sends the trimmed body and clears the draft on submit', async () => {
            const wrapper = mountComposer();
            await wrapper.find('.composer-input').setValue('  hello  ');
            await wrapper.find('.composer').trigger('submit');
            await flushPromises();

            expect(mockStore.sendStopTyping).toHaveBeenCalledWith(7);
            expect(mockStore.sendMessage).toHaveBeenCalledWith(7, 'hello');
            expect(wrapper.find('.composer-input').element.value).toBe('');
        });

        it('submits on Enter without shift', async () => {
            const wrapper = mountComposer();
            await wrapper.find('.composer-input').setValue('hey');
            await wrapper.find('.composer-input').trigger('keydown', { key: 'Enter' });
            await flushPromises();
            expect(mockStore.sendMessage).toHaveBeenCalledWith(7, 'hey');
        });

        it('does not submit on Shift+Enter', async () => {
            const wrapper = mountComposer();
            await wrapper.find('.composer-input').setValue('multi');
            await wrapper.find('.composer-input').trigger('keydown', { key: 'Enter', shiftKey: true });
            await flushPromises();
            expect(mockStore.sendMessage).not.toHaveBeenCalled();
        });

        it('surfaces a send failure through the store error and keeps the draft', async () => {
            mockStore.sendMessage.mockRejectedValue(new Error('boom'));
            const wrapper = mountComposer();
            await wrapper.find('.composer-input').setValue('keepme');
            await wrapper.find('.composer').trigger('submit');
            await flushPromises();

            expect(mockStore.lastError).toBe('boom');
            expect(wrapper.find('.composer-input').element.value).toBe('keepme');
        });
    });

    //image attachment
    describe('image attachment', () => {
        it('stages a preview for a valid image instead of uploading immediately', async () => {
            const wrapper = mountComposer();
            await pickFile(wrapper, pngFile());

            expect(wrapper.find('.image-preview').exists()).toBe(true);
            expect(wrapper.find('.preview-thumb').attributes('src')).toBe('blob:preview');
            expect(mockStore.sendImage).not.toHaveBeenCalled();
        });

        it('switches the placeholder to a caption prompt once an image is staged', async () => {
            const wrapper = mountComposer();
            await pickFile(wrapper, pngFile());
            expect(wrapper.find('.composer-input').attributes('placeholder')).toBe('Add a caption…');
        });

        it('rejects an unsupported file type with a store error', async () => {
            const wrapper = mountComposer();
            const gif = new File(['x'], 'bad.gif', { type: 'image/gif' });
            await pickFile(wrapper, gif);

            expect(mockStore.lastError).toBe('Only JPG and PNG images are allowed.');
            expect(wrapper.find('.image-preview').exists()).toBe(false);
        });

        it('removes the staged preview when the remove button is clicked', async () => {
            const wrapper = mountComposer();
            await pickFile(wrapper, pngFile());
            await wrapper.find('.remove-preview').trigger('click');
            expect(wrapper.find('.image-preview').exists()).toBe(false);
        });

        it('uploads the staged image with its caption on submit', async () => {
            const wrapper = mountComposer();
            await pickFile(wrapper, pngFile());
            await wrapper.find('.composer-input').setValue('here you go');
            await wrapper.find('.composer').trigger('submit');
            await flushPromises();

            expect(mockStore.sendImage).toHaveBeenCalledWith(7, expect.any(File), 'here you go');
            expect(wrapper.find('.image-preview').exists()).toBe(false);
        });
    });

    //character counter
    describe('character counter', () => {
        it('hides the counter well under the limit', async () => {
            const wrapper = mountComposer();
            await wrapper.find('.composer-input').setValue('short');
            expect(wrapper.find('.char-count').exists()).toBe(false);
        });

        it('shows the remaining count as the limit approaches', async () => {
            const wrapper = mountComposer();
            await wrapper.find('.composer-input').setValue('a'.repeat(1850));
            const counter = wrapper.find('.char-count');
            expect(counter.exists()).toBe(true);
            expect(counter.text()).toBe('150');
        });
    });
});
