const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  currentRoute: { value: { path: '/', meta: {} } },
  beforeEach: jest.fn(),
};

export default mockRouter;
