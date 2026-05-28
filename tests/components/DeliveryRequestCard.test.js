import { mount } from '@vue/test-utils';
import DeliveryRequestCard from '../../src/components/DeliveryRequestCard.vue';

const baseRequest = {
  id: 'req-1',
  requester: { name: 'TestUser', pfpUrl: null },
  stall: 'Western',
  canteen: 'YIH Canteen',
  deliveryLocation: 'COM3 Level 2',
  item: 'Chicken Rice',
};

function mountCard(props = {}) {
  return mount(DeliveryRequestCard, {
    props: { request: baseRequest, ...props },
  });
}

describe('DeliveryRequestCard', () => {
  // ── Rendering ─────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('shows the requester username with @ prefix', () => {
      const wrapper = mountCard();
      expect(wrapper.text()).toContain('@TestUser');
    });

    it('shows the canteen name', () => {
      const wrapper = mountCard();
      expect(wrapper.text()).toContain('YIH Canteen');
    });

    it('shows the delivery location', () => {
      const wrapper = mountCard();
      expect(wrapper.text()).toContain('COM3 Level 2');
    });

    it('shows the item text', () => {
      const wrapper = mountCard();
      expect(wrapper.text()).toContain('Chicken Rice');
    });

    it('shows the stall tag', () => {
      const wrapper = mountCard();
      expect(wrapper.text()).toContain('Western');
    });
  });

  // ── itemCount computed ────────────────────────────────────────────────────

  describe('itemCount', () => {
    it('counts 1 for a single-line item', () => {
      const wrapper = mountCard({ request: { ...baseRequest, item: 'Chicken Rice' } });
      expect(wrapper.text()).toContain('1 item');
    });

    it('counts multiple lines as separate items', () => {
      const wrapper = mountCard({
        request: { ...baseRequest, item: 'Chicken Rice\nDrink\nFries' },
      });
      expect(wrapper.text()).toContain('3 items');
    });

    it('uses plural "items" for more than one', () => {
      const wrapper = mountCard({
        request: { ...baseRequest, item: 'A\nB' },
      });
      expect(wrapper.text()).toContain('2 items');
    });

    it('uses singular "item" for exactly one', () => {
      const wrapper = mountCard({ request: { ...baseRequest, item: 'A' } });
      expect(wrapper.text()).toContain('1 item');
      expect(wrapper.text()).not.toContain('1 items');
    });

    it('handles an empty item string as 1', () => {
      const wrapper = mountCard({ request: { ...baseRequest, item: '' } });
      expect(wrapper.text()).toContain('1 item');
    });
  });

  // ── stallStyle computed ───────────────────────────────────────────────────

  describe('stallStyle', () => {
    // jsdom keeps rgba() as-is; hex colour values get normalised to rgb()
    it('applies green background for Western stall', () => {
      const wrapper = mountCard();
      const style = wrapper.find('.stall-tag').attributes('style');
      expect(style).toContain('rgba(16, 185, 129, 0.14)');
    });

    it('applies red background for Mala stall', () => {
      const wrapper = mountCard({ request: { ...baseRequest, stall: 'Mala' } });
      const style = wrapper.find('.stall-tag').attributes('style');
      expect(style).toContain('rgba(239, 68, 68, 0.14)');
    });

    it('applies blue background for Japanese stall', () => {
      const wrapper = mountCard({ request: { ...baseRequest, stall: 'Japanese' } });
      const style = wrapper.find('.stall-tag').attributes('style');
      expect(style).toContain('rgba(59, 130, 246, 0.13)');
    });

    it('falls back to orange background for an unknown stall', () => {
      const wrapper = mountCard({ request: { ...baseRequest, stall: 'Indian' } });
      const style = wrapper.find('.stall-tag').attributes('style');
      expect(style).toContain('rgba(239, 124, 0, 0.14)');
    });
  });

  // ── isOwn prop ────────────────────────────────────────────────────────────

  describe('isOwn prop', () => {
    it('shows the ACCEPT button when isOwn is false', () => {
      const wrapper = mountCard({ isOwn: false });
      expect(wrapper.find('.accept-btn').exists()).toBe(true);
      expect(wrapper.find('.own-order-status').exists()).toBe(false);
    });

    it('shows YOUR ORDER status and hides the button when isOwn is true', () => {
      const wrapper = mountCard({ isOwn: true });
      expect(wrapper.find('.accept-btn').exists()).toBe(false);
      expect(wrapper.find('.own-order-status').exists()).toBe(true);
      expect(wrapper.text()).toContain('YOUR ORDER');
    });
  });

  // ── accepting prop ────────────────────────────────────────────────────────

  describe('accepting prop', () => {
    it('shows "ACCEPT" label by default', () => {
      const wrapper = mountCard({ isOwn: false, accepting: false });
      expect(wrapper.find('.accept-btn').text()).toBe('ACCEPT');
    });

    it('shows "ACCEPTING…" label while accepting', () => {
      const wrapper = mountCard({ isOwn: false, accepting: true });
      expect(wrapper.find('.accept-btn').text()).toBe('ACCEPTING…');
    });

    it('disables the button while accepting', () => {
      const wrapper = mountCard({ isOwn: false, accepting: true });
      expect(wrapper.find('.accept-btn').attributes('disabled')).toBeDefined();
    });
  });

  // ── accept emit ───────────────────────────────────────────────────────────

  describe('accept event', () => {
    it('emits "accept" with the request id when the button is clicked', async () => {
      const wrapper = mountCard({ isOwn: false });
      await wrapper.find('.accept-btn').trigger('click');
      expect(wrapper.emitted('accept')).toBeTruthy();
      expect(wrapper.emitted('accept')[0]).toEqual(['req-1']);
    });
  });

  // ── requesterOnline prop ──────────────────────────────────────────────────

  describe('requesterOnline prop', () => {
    it('shows "Offline" and no .online class by default', () => {
      const wrapper = mountCard({ requesterOnline: false });
      const presence = wrapper.find('.presence');
      expect(wrapper.text()).toContain('Offline');
      expect(presence.classes()).not.toContain('online');
    });

    it('shows "Online" and adds .online class when requesterOnline is true', () => {
      const wrapper = mountCard({ requesterOnline: true });
      const presence = wrapper.find('.presence');
      expect(wrapper.text()).toContain('Online');
      expect(presence.classes()).toContain('online');
    });
  });

  // ── profile picture ───────────────────────────────────────────────────────

  describe('profile picture', () => {
    it('shows a fallback icon when pfpUrl is null', () => {
      const wrapper = mountCard();
      expect(wrapper.find('.pfp-img').exists()).toBe(false);
      expect(wrapper.find('.pfp-icon').exists()).toBe(true);
    });

    it('renders an img tag when pfpUrl is provided', () => {
      const wrapper = mountCard({
        request: { ...baseRequest, requester: { name: 'Alice', pfpUrl: '/uploads/alice.jpg' } },
      });
      const img = wrapper.find('.pfp-img');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toContain('/uploads/alice.jpg');
    });

    it('prepends VITE_FILE_SERVER_URL to the pfpUrl', () => {
      const wrapper = mountCard({
        request: { ...baseRequest, requester: { name: 'Alice', pfpUrl: '/uploads/alice.jpg' } },
      });
      expect(wrapper.find('.pfp-img').attributes('src')).toBe(
        'http://localhost:9000/uploads/alice.jpg'
      );
    });
  });
});
