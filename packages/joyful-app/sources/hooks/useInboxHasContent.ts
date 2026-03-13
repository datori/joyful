import { useUpdates } from './useUpdates';
import { useChangelog } from './useChangelog';

// Hook to check if the Updates tab has content to show
export function useInboxHasContent(): boolean {
    const { updateAvailable } = useUpdates();
    const changelog = useChangelog();

    return updateAvailable || (changelog.hasUnread === true);
}