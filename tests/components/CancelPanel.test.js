import { mount } from '@vue/test-utils';
import CancelPanel from '../../src/components/CancelPanel.vue';

function mountPanel(props = {}) {
    return mount(CancelPanel, {
        props: {
            needsCancelReason: true,
            cancelling: false,
            ...props,
        },
    });
}

describe('CancelPanel.vue', () => {
    let wrapper;

    afterEach(() => {
        wrapper?.unmount();
    });

    it('shows the penalty warning when a cancellation reason is required', () => {
        wrapper = mountPanel({ needsCancelReason: true });

        expect(wrapper.find('.cancel-penalty').exists()).toBe(true);
        expect(wrapper.find('.cancel-penalty').text()).toContain('you will lose 1 point');
    });

    it('does not show the penalty warning when a cancellation reason is not required', () => {
        wrapper = mountPanel({ needsCancelReason: false });

        expect(wrapper.find('.cancel-penalty').exists()).toBe(false);
    });

    it('emits close when Keep Order is clicked', async () => {
        wrapper = mountPanel();

        await wrapper.find('.keep-btn').trigger('click');

        expect(wrapper.emitted('close')).toHaveLength(1);
        expect(wrapper.emitted('cancel')).toBeUndefined();
    });

    it('emits close when the X button is clicked', async () => {
        wrapper = mountPanel();

        await wrapper.find('.cancel-close').trigger('click');

        expect(wrapper.emitted('close')).toHaveLength(1);
        expect(wrapper.emitted('cancel')).toBeUndefined();
    });

    it('shows an error and does not emit cancel when reason is required but empty', async () => {
        wrapper = mountPanel({ needsCancelReason: true });

        await wrapper.find('.cancel-btn.compact').trigger('click');

        expect(wrapper.find('.cancel-error').exists()).toBe(true);
        expect(wrapper.find('.cancel-error').text()).toBe('Please add a reason before cancelling.');
        expect(wrapper.emitted('cancel')).toBeUndefined();
        expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('emits cancel with the provided reason when reason is required', async () => {
        wrapper = mountPanel({ needsCancelReason: true });

        await wrapper.find('textarea').setValue('Running late, cannot make it');
        await wrapper.find('.cancel-btn.compact').trigger('click');

        expect(wrapper.emitted('cancel')).toHaveLength(1);
        expect(wrapper.emitted('cancel')[0]).toEqual([
            {
                reason: 'Running late, cannot make it',
            },
        ]);
        expect(wrapper.find('.cancel-error').exists()).toBe(false);
    });

    it('emits cancel with null reason when reason is not required', async () => {
        wrapper = mountPanel({ needsCancelReason: false });

        await wrapper.find('.cancel-btn.compact').trigger('click');

        expect(wrapper.emitted('cancel')).toHaveLength(1);
        expect(wrapper.emitted('cancel')[0]).toEqual([
            {
                reason: null,
            },
        ]);
    });

    it('cleans unsupported characters from the reason textarea', async () => {
        wrapper = mountPanel({ needsCancelReason: true });

        await wrapper.find('textarea').setValue('Late <script>\u0000'); // NULL

        expect(wrapper.find('textarea').element.value).toBe('Late script');
    });

    it('disables action buttons while cancelling', () => {
        wrapper = mountPanel({ cancelling: true });

        expect(wrapper.find('.keep-btn').attributes('disabled')).toBeDefined();
        expect(wrapper.find('.cancel-close').attributes('disabled')).toBeDefined();
        expect(wrapper.find('.cancel-btn.compact').attributes('disabled')).toBeDefined();
        expect(wrapper.find('.cancel-btn.compact').text()).toBe('CANCELLING...');
    });

    it('does not emit cancel while cancelling', async () => {
        wrapper = mountPanel({
            needsCancelReason: true,
            cancelling: true,
        });

        await wrapper.find('textarea').setValue('Changed my mind');
        await wrapper.find('.cancel-btn.compact').trigger('click');

        expect(wrapper.emitted('cancel')).toBeUndefined();
    });
});