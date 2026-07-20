import { renderHook, waitFor } from '@testing-library/react-native';

import { api } from '@/lib/api';
import { kv, STORAGE_KEYS } from '@/lib/storage';

import { useGenerationJob } from './useGenerationJob';
import { useLetterGeneration } from './useLetterGeneration';

jest.mock('@/lib/api', () => ({ api: { requestLetter: jest.fn() } }));
jest.mock('./useGenerationJob', () => ({ useGenerationJob: jest.fn() }));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedJob = useGenerationJob as jest.MockedFunction<typeof useGenerationJob>;

/**
 * The hook is thin glue: it decides WHEN to ask for a letter. The rules it
 * applies — attempt bumping, key derivation, phase mapping — are pure and live
 * in `generationState`, which is where they are tested exhaustively. What is
 * left here is the wiring, asserted through the request it makes rather than
 * through rendered state (the hook holds a live interval, and reading its
 * result across tests proved to be a pollution trap rather than a real signal).
 */
describe('useLetterGeneration', () => {
  beforeEach(() => {
    kv.delete(STORAGE_KEYS.letterAttempt);
    jest.clearAllMocks();
    mockedApi.requestLetter.mockResolvedValue({ jobId: 'job-1' });
    mockedJob.mockReturnValue({ data: undefined } as ReturnType<typeof useGenerationJob>);
  });

  it('requests the letter on mount', async () => {
    const view = await renderHook(() => useLetterGeneration('user-1'));

    await waitFor(() => expect(mockedApi.requestLetter).toHaveBeenCalledTimes(1));
    view.unmount();
  });

  it('waits for a user before requesting anything', async () => {
    const view = await renderHook(() => useLetterGeneration(undefined));

    expect(mockedApi.requestLetter).not.toHaveBeenCalled();
    view.unmount();
  });

  it('keys the request to the user and the attempt', async () => {
    const view = await renderHook(() => useLetterGeneration('user-1'));

    await waitFor(() => expect(mockedApi.requestLetter).toHaveBeenCalledWith('letter:user-1:1'));
    view.unmount();
  });

  it('persists the attempt so a relaunch resumes it rather than replaying', async () => {
    const view = await renderHook(() => useLetterGeneration('user-1'));

    await waitFor(() => expect(kv.get<number>(STORAGE_KEYS.letterAttempt)).toBe(1));
    view.unmount();
  });

  it('reuses the same attempt on a remount — a remount is not a retry', async () => {
    const first = await renderHook(() => useLetterGeneration('user-1'));
    await waitFor(() => expect(mockedApi.requestLetter).toHaveBeenCalledTimes(1));
    first.unmount();

    const second = await renderHook(() => useLetterGeneration('user-1'));

    await waitFor(() => expect(mockedApi.requestLetter).toHaveBeenCalledTimes(2));
    expect(mockedApi.requestLetter).toHaveBeenLastCalledWith('letter:user-1:1');
    second.unmount();
  });
});
