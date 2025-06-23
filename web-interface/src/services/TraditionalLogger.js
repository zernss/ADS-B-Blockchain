class TraditionalLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
    this.listeners = new Set();
  }

  log(level, message, data = {}) {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      level, // 'info', 'success', 'warning', 'error'
      message,
      data,
    };

    this.logs.unshift(logEntry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.notifyListeners(logEntry);
    console.log(`[TRADITIONAL LOG] ${level.toUpperCase()}: ${message}`, data);
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners({ type: 'clear' });
  }

  getLogStats() {
    const stats = {
      info: 0,
      success: 0,
      warning: 0,
      error: 0,
    };
    this.logs.forEach(log => {
      if (stats[log.level] !== undefined) {
        stats[log.level]++;
      }
    });
    return stats;
  }

  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners(logEntry) {
    for (const listener of this.listeners) {
      listener(logEntry);
    }
  }
}

const traditionalLogger = new TraditionalLogger();
export default traditionalLogger; 