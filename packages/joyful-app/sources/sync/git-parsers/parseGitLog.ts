/**
 * Git log parser
 * Parses output of: git log --format="%H|%h|%s|%an|%ar" -30
 */

export interface GitCommit {
    fullHash: string;
    shortHash: string;
    subject: string;
    author: string;
    relativeTime: string;
}

/**
 * Parse git log output into an array of commits.
 * Expects each line in format: fullHash|shortHash|subject|author|relativeTime
 */
export function parseGitLog(output: string): GitCommit[] {
    const lines = output.trim().split('\n').filter(line => line.length > 0);
    const commits: GitCommit[] = [];

    for (const line of lines) {
        const parts = line.split('|');
        if (parts.length < 5) continue;

        const [fullHash, shortHash, ...rest] = parts;
        // Subject and author may contain '|', so we take last two as relativeTime and author
        const relativeTime = rest[rest.length - 1];
        const author = rest[rest.length - 2];
        const subject = rest.slice(0, rest.length - 2).join('|');

        if (!fullHash || !shortHash) continue;

        commits.push({
            fullHash: fullHash.trim(),
            shortHash: shortHash.trim(),
            subject: subject.trim(),
            author: author?.trim() ?? '',
            relativeTime: relativeTime?.trim() ?? '',
        });
    }

    return commits;
}
