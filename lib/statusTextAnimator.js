class StatusTextAnimator {
    constructor(target) {
        this.target = target;
        this.animationRunning = false;
        this.fadeOutTimeout = null;
    }

    attach(target) {
        this.target = target;
    }

    showStatusText(text, duration = null, speed = 50) {
        const statusText = this.target;
      
        if (this.animationRunning) {
          statusText.textContent = text;
          clearTimeout(this.fadeOutTimeout);
          if(duration){
              this.fadeOutTimeout = setTimeout(() => {
                const fadeOutInterval = setInterval(() => {
                  let opacity = parseFloat(statusText.style.opacity);
                  opacity -= 0.1;
                  statusText.style.opacity = opacity;
                  if (opacity <= 0) {
                    clearInterval(fadeOutInterval);
                    statusText.style.visibility = 'hidden';
                    this.animationRunning = false;
                  }
                }, speed);
              }, duration);
          }
          return;
        }
        this.animationRunning = true;
        statusText.textContent = text;
        statusText.style.opacity = 0;
        statusText.style.visibility = 'visible';
      
        let opacity = 0;
        const fadeInInterval = setInterval(() => {
          opacity += 0.1;
          statusText.style.opacity = opacity;
          if (opacity >= 1) {
            clearInterval(fadeInInterval);
            if (duration) {
              this.fadeOutTimeout = setTimeout(() => {
                const fadeOutInterval = setInterval(() => {
                  let opacity = parseFloat(statusText.style.opacity);
                  opacity -= 0.1;
                  statusText.style.opacity = opacity;
                  if (opacity <= 0) {
                    clearInterval(fadeOutInterval);
                    statusText.style.visibility = 'hidden';
                    this.animationRunning = false;
                  }
                }, speed);
              }, duration);
            } else {
              this.animationRunning = false;
            }
          }
        }, speed);
      }

      clearStatusText() {
        this.target.textContent = '';
        clearTimeout(this.fadeOutTimeout);
        this.target.style.visibility = 'hidden';
        this.animationRunning = false;
      }

}