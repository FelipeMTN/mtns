export class RateLimiter {
	private timestamps: Map<string, Date[]> = new Map();
	private readonly limit: number;
	private readonly timeWindowMs: number;

	constructor(timeWindowMs: number, limit: number) {
		this.limit = limit;
		this.timeWindowMs = timeWindowMs;
	}

	/**
	 * Attempts to perform an operation for a specific user
	 * @param userId - Unique identifier for the user
	 * @returns true if allowed, false if rate limited
	 */
	tryOperation(userId: string): boolean {
		const now = new Date();

		if (!this.timestamps.has(userId)) {
			this.timestamps.set(userId, []);
		}

		let timestamps = this.timestamps.get(userId)!;
		timestamps = timestamps.filter((timestamp) => {
			return now.getTime() - timestamp.getTime() < this.timeWindowMs;
		});

		this.timestamps.set(userId, timestamps);

		if (timestamps.length >= this.limit) {
			return false;
		}

		timestamps.push(now);
		this.timestamps.set(userId, timestamps);
		return true;
	}

	/**
	 * Returns the number of operations remaining for a user in the current time window
	 * @param userId - Unique identifier for the user
	 */
	getRemainingOperations(userId: string): number {
		if (!this.timestamps.has(userId)) {
			return this.limit;
		}

		const now = new Date();
		let timestamps = this.timestamps.get(userId)!;
		timestamps = timestamps.filter((timestamp) => {
			return now.getTime() - timestamp.getTime() < this.timeWindowMs;
		});
		this.timestamps.set(userId, timestamps);

		return Math.max(0, this.limit - timestamps.length);
	}

	/**
	 * Returns the time in milliseconds until the next operation will be allowed for a user
	 * Returns 0 if operations are currently allowed
	 * @param userId - Unique identifier for the user
	 */
	getTimeUntilNextAvailable(userId: string): number {
		if (!this.timestamps.has(userId) || this.getRemainingOperations(userId) > 0) {
			return 0;
		}

		const timestamps = this.timestamps.get(userId)!;
		const oldestTimestamp = timestamps.reduce((oldest, current) => (current.getTime() < oldest.getTime() ? current : oldest));

		const now = new Date();
		return Math.max(0, oldestTimestamp.getTime() + this.timeWindowMs - now.getTime());
	}

	/**
	 * Cleans up old data for all users
	 * Call this periodically to prevent memory leaks from inactive users
	 */
	cleanup(): void {
		const now = new Date();

		for (const [userId, timestamps] of this.timestamps.entries()) {
			const filteredTimestamps = timestamps.filter((timestamp) => {
				return now.getTime() - timestamp.getTime() < this.timeWindowMs;
			});

			if (filteredTimestamps.length === 0) {
				this.timestamps.delete(userId);
			} else {
				this.timestamps.set(userId, filteredTimestamps);
			}
		}
	}
}
