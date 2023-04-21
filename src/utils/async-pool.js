function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Class MinHeap is used to create a priority queue
 */
class MinHeap {
    constructor() {
        this.heap = [];
    }

    /**
     * Place an element in the priority queue.
     *
     * @param {any} element
     * @param {number} priority Priority of the element
     */
    enqueue(element, priority) {
        this.heap.push({ element, priority });
        let current = this.heap.length - 1;

        while (current > 0 && this.heap[current].priority < this.heap[this._getParentIndex(current)].priority) {
            this._swap(current, this._getParentIndex(current));
            current = this._getParentIndex(current);
        }
    }

    /**
     * The function returns the element with the highest priority and removes it from the heap.
     * @returns {any} The function to be executed that returns a promise
     */
    dequeue() {
        if (this.heap.length === 0) {
            return null;
        }

        const element = this.heap[0].element;
        this.heap[0] = this.heap[this.heap.length - 1];
        this.heap.pop();

        let current = 0;
        let leftChild = this._getLeftChildIndex(current);
        let rightChild = this._getRightChildIndex(current);

        while ((leftChild < this.heap.length && this.heap[current].priority > this.heap[leftChild].priority) ||
                (rightChild < this.heap.length && this.heap[current].priority > this.heap[rightChild].priority)) {

            let minChild = leftChild;
            if (rightChild < this.heap.length && this.heap[rightChild].priority < this.heap[leftChild].priority) {
                minChild = rightChild;
            }

            this._swap(current, minChild);
            current = minChild;
            leftChild = this._getLeftChildIndex(current);
            rightChild = this._getRightChildIndex(current);
        }

        return element;
    }


    // The function checks if the heap length is 0.
    isEmpty() {
        return this.heap.length === 0;
    }

    // The function returns the element with the highest priority
    peek() {
        return this.heap[0];
    }

    _getParentIndex(i) {
        return Math.floor((i - 1) / 2);
    }

    _getLeftChildIndex(i) {
        return 2 * i + 1;
    }

    _getRightChildIndex(i) {
        return 2 * i + 2;
    }

    _swap(i, j) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
}

/**
 * The class is used to limit the number of concurrent tasks
 * and the number of tasks executed per minute.
 * You can use the class to limit the number of requests to a server.
 * Also, a task in priority queue can be canceled.
 * 
 * @example
 * const pool = new AsyncPool(2, 1);
 * const taskId = await pool.add(async () => {
 *     await sleep(1000);
 *     console.log('Task 1');
 * }, 1);
 * await pool.add(async () => {
 *     await sleep(1000);
 *     console.log('Task 2');
 * }, 2);
 * await pool.add(async () => {
 *     await sleep(1000);
 *     console.log('Task 3');
 * }, 3);
 * pool.cancel(taskId);
 */
class AsyncPool {
    /**
     * @param {number} concurrency - The maximum number of concurrent tasks.
     * @param {number} rateLimit - The maximum number of tasks executed per minute.
     */
    constructor(concurrency = Infinity, rateLimit = Infinity) {
        this.concurrency = concurrency;
        this.rateLimit = rateLimit;
        this.queue = new MinHeap();
        this.tasksInQueue = new Map();
        this.runningPromises = [];
        this.executionTimes = [];
    }


    /**
     * It adds a new task to the queue. The task is a function that returns a promise.
     * @param {Function} task The function to be executed that returns a promise
     * @param {number} priority The priority is a number that determines the order in which the tasks are executed.
     * @returns A taskId that is Symbol that can be used to cancel the task
     */
    async add(task, priority) {
        const taskId = Symbol();
        const cancelToken = { canceled: false };
        this.tasksInQueue.set(taskId, cancelToken);
        this.queue.enqueue(() => {
            this.tasksInQueue.delete(taskId);
            if (cancelToken.canceled) {
                return;
            }
            return task();
        }, priority);

        await this.run();
        return taskId;
    }

    /**
     * Cancel a task by taskId
     * @param {number} taskId
     */
    cancel(taskId) {
        const cancelToken = this.tasksInQueue.get(taskId);
        if (cancelToken) {
            cancelToken.canceled = true;
            this.tasksInQueue.delete(taskId);
        }
    }

    async run() {
        if (this.queue.isEmpty() || this.runningPromises.length >= this.concurrency) {
            return;
        }

        // Check rate limit
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        this.executionTimes = this.executionTimes.filter(time => time >= oneMinuteAgo);

        if (this.executionTimes.length >= this.rateLimit) {
            const minTime = Math.min(...this.executionTimes);
            const delay = minTime + 60000 - now;
            // Wait for the next minute
            await sleep(delay);
            this.run();
            return;
        }

        // Run the next task
        const task = this.queue.dequeue();
        const promise = task().finally(() => {
            this.runningPromises = this.runningPromises.filter(p => p !== promise);
            this.run();
        });

        this.runningPromises.push(promise);
        this.executionTimes.push(now);

        // Wait for a task to complete before calling run() again
        Promise.race(this.runningPromises).then(() => this.run());
    }
}

exports.AsyncPool = AsyncPool;
