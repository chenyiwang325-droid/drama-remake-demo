/**
 * 文件上传进度条组件
 * 使用 Fetch API 的流式上传追踪进度
 */

class UploadProgressBar {
  constructor(containerId = 'upload-progress-container') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      // 如果容器不存在，动态创建
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'upload-progress-overlay';
      document.body.appendChild(this.container);
    }
  }

  /**
   * 显示进度条
   */
  show(filename = '文件上传中...') {
    this.container.innerHTML = `
      <div class="upload-progress-modal">
        <div class="upload-progress-header">
          <span class="upload-progress-icon">📤</span>
          <h3 class="upload-progress-title">${this._escapeHtml(filename)}</h3>
        </div>
        <div class="upload-progress-body">
          <div class="upload-progress-bar">
            <div class="upload-progress-bar-fill" id="upload-progress-fill" style="width: 0%"></div>
          </div>
          <div class="upload-progress-info">
            <span id="upload-progress-percent">0%</span>
            <span id="upload-progress-size">0 MB / 0 MB</span>
            <span id="upload-progress-speed">0 KB/s</span>
          </div>
          <div class="upload-progress-eta" id="upload-progress-eta">准备中...</div>
        </div>
      </div>
    `;
    this.container.style.display = 'flex';

    this.progressFill = document.getElementById('upload-progress-fill');
    this.progressPercent = document.getElementById('upload-progress-percent');
    this.progressSize = document.getElementById('upload-progress-size');
    this.progressSpeed = document.getElementById('upload-progress-speed');
    this.progressEta = document.getElementById('upload-progress-eta');

    this.startTime = Date.now();
    this.lastLoaded = 0;
    this.lastTime = Date.now();
  }

  /**
   * 更新进度
   */
  update(loaded, total) {
    const percent = Math.round((loaded / total) * 100);
    const loadedMB = (loaded / (1024 * 1024)).toFixed(2);
    const totalMB = (total / (1024 * 1024)).toFixed(2);

    // 更新进度条
    if (this.progressFill) {
      this.progressFill.style.width = percent + '%';
    }
    if (this.progressPercent) {
      this.progressPercent.textContent = percent + '%';
    }
    if (this.progressSize) {
      this.progressSize.textContent = `${loadedMB} MB / ${totalMB} MB`;
    }

    // 计算速度和剩余时间
    const now = Date.now();
    const timeDiff = (now - this.lastTime) / 1000; // 秒
    if (timeDiff > 0.5) {  // 每0.5秒更新一次速度
      const bytesDiff = loaded - this.lastLoaded;
      const speed = bytesDiff / timeDiff; // bytes/s
      const speedKB = (speed / 1024).toFixed(1);

      if (this.progressSpeed) {
        this.progressSpeed.textContent = `${speedKB} KB/s`;
      }

      // 估算剩余时间
      const remaining = total - loaded;
      const eta = speed > 0 ? remaining / speed : 0;
      if (this.progressEta && eta > 0) {
        this.progressEta.textContent = `剩余时间：${this._formatTime(eta)}`;
      }

      this.lastLoaded = loaded;
      this.lastTime = now;
    }
  }

  /**
   * 隐藏进度条
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * 显示错误
   */
  showError(message) {
    if (this.container) {
      this.container.innerHTML = `
        <div class="upload-progress-modal upload-error">
          <div class="upload-progress-header">
            <span class="upload-progress-icon">❌</span>
            <h3 class="upload-progress-title">上传失败</h3>
          </div>
          <div class="upload-progress-body">
            <p class="upload-error-message">${this._escapeHtml(message)}</p>
            <button class="b bs" onclick="document.getElementById('upload-progress-container').style.display='none'">
              关闭
            </button>
          </div>
        </div>
      `;
    }
  }

  /**
   * 格式化时间（秒 -> 可读格式）
   */
  _formatTime(seconds) {
    if (seconds < 60) {
      return `${Math.round(seconds)} 秒`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins} 分 ${secs} 秒`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours} 小时 ${mins} 分钟`;
    }
  }

  /**
   * HTML 转义
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * 使用 XMLHttpRequest 上传文件（支持进度追踪）
 */
function uploadFileWithProgress(url, formData, onProgress, onComplete, onError) {
  const xhr = new XMLHttpRequest();

  // 监听上传进度
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable && onProgress) {
      onProgress(e.loaded, e.total);
    }
  });

  // 监听完成
  xhr.addEventListener('load', () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const response = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        if (onComplete) onComplete(response);
      } catch (e) {
        if (onComplete) onComplete({});
      }
    } else {
      if (onError) {
        try {
          const error = JSON.parse(xhr.responseText);
          onError(error.detail || `上传失败 (${xhr.status})`);
        } catch (e) {
          onError(`上传失败 (${xhr.status})`);
        }
      }
    }
  });

  // 监听错误
  xhr.addEventListener('error', () => {
    if (onError) onError('网络错误，请检查连接后重试');
  });

  // 监听超时
  xhr.addEventListener('timeout', () => {
    if (onError) onError('上传超时，请重试');
  });

  xhr.timeout = 600000; // 10分钟超时
  xhr.open('POST', url, true);
  xhr.send(formData);

  return xhr;
}

// 导出给全局使用
window.UploadProgressBar = UploadProgressBar;
window.uploadFileWithProgress = uploadFileWithProgress;
