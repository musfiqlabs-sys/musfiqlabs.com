/**
 * MUSFIQLABS — Premium AI Automation Agency
 * Scroll-Driven Canvas Frame Sequencer & Interactive Features
 */

(function () {
  'use strict';

  // Configuration for Background Frame Sequencer
  const TOTAL_FRAMES = 240;
  const FRAME_PREFIX = 'frames/frame_';
  const FRAME_EXT = '.png';
  const NATIVE_WIDTH = 1280;
  const NATIVE_HEIGHT = 720;
  const LERP_FACTOR = 0.12; // Smoothing factor for scroll inertia
  const CONCURRENCY = 8;    // Simultaneous image preloading requests

  // DOM Elements
  const canvas = document.getElementById('frame-canvas');
  const ctx = canvas ? canvas.getContext('2d', { alpha: false, desynchronized: true }) : null;
  const loaderOverlay = document.getElementById('loader-overlay');
  const loaderBar = document.getElementById('loader-bar');
  const loaderPercent = document.getElementById('loader-percent');
  const loaderCount = document.getElementById('loader-count');
  const navLinks = document.querySelectorAll('.nav-link');

  // Background Canvas State
  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let currentFrame = 0;
  let targetFrame = 0;
  let lastRenderedIndex = -1;
  let isReady = false;
  let overlayHidden = false;

  /**
   * Helper to format 6-digit frame numbers
   */
  function getFrameUrl(index) {
    return `${FRAME_PREFIX}${String(index).padStart(6, '0')}${FRAME_EXT}`;
  }

  /**
   * Dismiss the loading overlay smoothly
   */
  function dismissLoader() {
    if (overlayHidden) return;
    overlayHidden = true;
    if (loaderBar) loaderBar.style.width = '100%';
    if (loaderPercent) loaderPercent.textContent = '100%';
    if (loaderOverlay) {
      loaderOverlay.classList.add('hidden');
    }
  }

  /**
   * Preload a single frame with off-thread image decode
   */
  async function loadFrame(index) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = getFrameUrl(index);

      const onLoaded = async () => {
        if ('decode' in img) {
          try {
            await img.decode();
          } catch (e) {
            // Graceful fallback
          }
        }
        images[index] = img;
        loadedCount++;
        updateLoadingProgress();

        // Render first frame immediately and reveal page
        if (index === 0 && lastRenderedIndex === -1 && ctx) {
          renderFrame(0, true);
          setTimeout(dismissLoader, 300);
        }
        resolve();
      };

      img.onload = onLoaded;
      img.onerror = () => {
        loadedCount++;
        updateLoadingProgress();
        resolve();
      };
    });
  }

  /**
   * Update loading progress UI
   */
  function updateLoadingProgress() {
    const progress = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100));
    if (loaderBar) loaderBar.style.width = `${progress}%`;
    if (loaderPercent) loaderPercent.textContent = `${progress}%`;
    if (loaderCount) loaderCount.textContent = `${loadedCount} / ${TOTAL_FRAMES} FRAMES`;
  }

  /**
   * Batch preloader with bounded concurrency & non-blocking progressive stream
   */
  async function preloadAllFrames() {
    // Priority load frame 0 first for instant visual
    await loadFrame(0);

    // Guaranteed fallback to dismiss loader after 500ms max
    setTimeout(dismissLoader, 500);

    // Progressive stream the remaining frames in background
    const frameIndices = Array.from({ length: TOTAL_FRAMES - 1 }, (_, i) => i + 1);
    const pool = [];

    for (const index of frameIndices) {
      const p = loadFrame(index).then(() => {
        pool.splice(pool.indexOf(p), 1);
      });
      pool.push(p);

      if (pool.length >= CONCURRENCY) {
        await Promise.race(pool);
      }
    }

    await Promise.all(pool);
    isReady = true;
    dismissLoader();
  }

  /**
   * Adjust canvas resolution and maintain aspect ratio
   */
  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;

    if (lastRenderedIndex >= 0) {
      renderFrame(lastRenderedIndex, true);
    }
  }

  /**
   * Draw specific frame index onto the canvas (finds nearest loaded frame if current isn't yet ready)
   */
  function renderFrame(index, force = false) {
    if (!canvas || !ctx) return;
    if (!force && index === lastRenderedIndex) return;

    let img = images[index];
    if (!img) {
      // Fallback to nearest loaded frame
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        if (index - offset >= 0 && images[index - offset]) {
          img = images[index - offset];
          break;
        }
        if (index + offset < TOTAL_FRAMES && images[index + offset]) {
          img = images[index + offset];
          break;
        }
      }
    }

    if (!img) return;

    const cWidth = canvas.width;
    const cHeight = canvas.height;

    // Cover fit logic for background fill
    const targetAspect = NATIVE_WIDTH / NATIVE_HEIGHT;
    const canvasAspect = cWidth / cHeight;

    let drawW, drawH, drawX, drawY;

    if (canvasAspect > targetAspect) {
      drawW = cWidth;
      drawH = cWidth / targetAspect;
      drawX = 0;
      drawY = (cHeight - drawH) / 2;
    } else {
      drawH = cHeight;
      drawW = cHeight * targetAspect;
      drawX = (cWidth - drawW) / 2;
      drawY = 0;
    }

    // Fill backdrop
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, cWidth, cHeight);

    // Draw frame
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    lastRenderedIndex = index;
  }

  /**
   * Calculate scroll position and map to target frame index
   */
  function onScroll() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const scrollY = Math.max(0, Math.min(window.scrollY, maxScroll));
    const progress = scrollY / maxScroll;

    targetFrame = progress * (TOTAL_FRAMES - 1);
    updateActiveNav();
  }

  /**
   * Continuous RAF LERP animation loop
   */
  function animationLoop() {
    const delta = targetFrame - currentFrame;
    if (Math.abs(delta) > 0.0001) {
      currentFrame += delta * LERP_FACTOR;
    } else {
      currentFrame = targetFrame;
    }

    const frameToRender = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(currentFrame)));
    renderFrame(frameToRender);

    requestAnimationFrame(animationLoop);
  }

  // ==========================================================
  // Interactive Call Simulator Scenarios
  // ==========================================================
  const SCENARIOS = {
    hvac: {
      name: 'Sarah Miller (HVAC Inbound)',
      avatar: 'SM',
      duration: '00:48',
      latency: '380ms',
      bookingEvent: 'Appointment Booked: Tuesday 2:30 PM (Emergency Dispatch)',
      dialogue: [
        {
          sender: 'AI RECEPTIONIST',
          isAI: true,
          text: 'Thanks for calling Apex Heating & Air! This is our AI assistant. I understand your upstairs AC unit stopped cooling today — is that right?'
        },
        {
          sender: 'SARAH (HOMEOWNER)',
          isAI: false,
          text: 'Yes! It is blowing warm air and the house is already 82 degrees. Can someone come out today or tomorrow?'
        },
        {
          sender: 'AI RECEPTIONIST',
          isAI: true,
          text: 'I can get a senior certified diagnostic technician to your address tomorrow, Tuesday. We have an open priority slot between 2:00 PM and 3:30 PM. Would 2:30 PM work for you?'
        },
        {
          sender: 'SARAH (HOMEOWNER)',
          isAI: false,
          text: 'Yes, 2:30 PM is perfect.'
        },
        {
          sender: 'AI RECEPTIONIST',
          isAI: true,
          text: 'You are all set for Tuesday at 2:30 PM! I have reserved technician Mike and sent a confirmation SMS to your phone with tracking info.'
        }
      ]
    },
    medspa: {
      name: 'Jessica Taylor (Med Spa Lead)',
      avatar: 'JT',
      duration: '00:52',
      latency: '410ms',
      bookingEvent: 'Consultation Booked: Thursday 11:00 AM (Injectables Clinic)',
      dialogue: [
        {
          sender: 'AI APPOINTMENT SETTER',
          isAI: true,
          text: 'Hi Jessica! This is Maya from Lumière Aesthetics following up on your inquiry for our signature skin tightening and dermal filler consultation.'
        },
        {
          sender: 'JESSICA (CLIENT)',
          isAI: false,
          text: 'Hi Maya! Yes, I was looking for a consultation before an event next month.'
        },
        {
          sender: 'AI APPOINTMENT SETTER',
          isAI: true,
          text: 'Wonderful! Dr. Chen has two VIP consultation openings this Thursday — 11:00 AM or 3:15 PM. Which one fits your schedule best?'
        },
        {
          sender: 'JESSICA (CLIENT)',
          isAI: false,
          text: '11:00 AM works great for me.'
        },
        {
          sender: 'AI APPOINTMENT SETTER',
          isAI: true,
          text: 'Perfect, Jessica! Your private consultation is confirmed for Thursday at 11:00 AM. I have sent your pre-consultation intake form via SMS.'
        }
      ]
    },
    roofing: {
      name: 'David Ross (Roofing Inspection)',
      avatar: 'DR',
      duration: '00:44',
      latency: '360ms',
      bookingEvent: 'Inspection Booked: Wednesday 9:00 AM (Free Drone Roof Audit)',
      dialogue: [
        {
          sender: 'AI VOICE AGENT',
          isAI: true,
          text: 'Hello David! Calling from Summit Roofing. Noticed your request for a free drone roof inspection following the hail storm in Oakridge.'
        },
        {
          sender: 'DAVID (PROPERTY OWNER)',
          isAI: false,
          text: 'Hey! Yes, our neighbors noticed shingle damage and I want to see if our insurance covers it.'
        },
        {
          sender: 'AI VOICE AGENT',
          isAI: true,
          text: 'We handle insurance claims from start to finish. Our field estimator can do a complete 4K drone inspection this Wednesday at 9:00 AM. Does that work?'
        },
        {
          sender: 'DAVID (PROPERTY OWNER)',
          isAI: false,
          text: 'Wednesday at 9 works. Will I get a written estimate on the spot?'
        },
        {
          sender: 'AI VOICE AGENT',
          isAI: true,
          text: 'Yes, full digital report and estimate within 30 minutes of inspection! Locked in for Wednesday at 9:00 AM.'
        }
      ]
    },
    legal: {
      name: 'Michael Vance (Legal Intake)',
      avatar: 'MV',
      duration: '01:05',
      latency: '440ms',
      bookingEvent: 'Case Review Booked: Friday 1:00 PM (Partner Strategy Call)',
      dialogue: [
        {
          sender: 'AI INTAKE SPECIALIST',
          isAI: true,
          text: 'Good afternoon, thank you for contacting Sterling Law Partners. I am the confidential AI intake assistant. Are you calling regarding a new corporate contract matter?'
        },
        {
          sender: 'MICHAEL (BUSINESS OWNER)',
          isAI: false,
          text: 'Yes, we are acquiring a competitor and need an immediate contract and compliance review.'
        },
        {
          sender: 'AI INTAKE SPECIALIST',
          isAI: true,
          text: 'Understood. Based on transaction size, partner Robert Sterling is available for a direct 30-minute conflict-cleared strategy call this Friday at 1:00 PM.'
        },
        {
          sender: 'MICHAEL (BUSINESS OWNER)',
          isAI: false,
          text: 'Let us do Friday at 1:00 PM.'
        },
        {
          sender: 'AI INTAKE SPECIALIST',
          isAI: true,
          text: 'Confirmed. Case file #8492 is created in Clio CRM, and calendar invites with secure Zoom credentials have been sent to your email.'
        }
      ]
    }
  };

  /**
   * Render scenario transcript in the interactive call terminal
   */
  function renderScenario(scenarioKey) {
    const data = SCENARIOS[scenarioKey];
    if (!data) return;

    const callerName = document.getElementById('terminal-caller-name');
    const callerAvatar = document.getElementById('terminal-avatar');
    const callDuration = document.getElementById('terminal-call-duration');
    const bookingEvent = document.getElementById('terminal-booking-event');
    const transcriptStream = document.getElementById('terminal-transcript-stream');

    if (callerName) callerName.textContent = data.name;
    if (callerAvatar) callerAvatar.textContent = data.avatar;
    if (callDuration) callDuration.textContent = `Call Duration: ${data.duration}`;
    if (bookingEvent) bookingEvent.textContent = data.bookingEvent;

    if (!transcriptStream) return;
    transcriptStream.innerHTML = '';

    data.dialogue.forEach((msg, idx) => {
      setTimeout(() => {
        const row = document.createElement('div');
        row.className = `msg-row ${msg.isAI ? 'msg-ai' : 'msg-caller'}`;

        const sender = document.createElement('div');
        sender.className = 'msg-sender';
        sender.textContent = msg.sender;

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.textContent = msg.text;

        row.appendChild(sender);
        row.appendChild(bubble);
        transcriptStream.appendChild(row);

        transcriptStream.scrollTop = transcriptStream.scrollHeight;
      }, idx * 180);
    });
  }

  /**
   * Setup interactive scenario button clicks
   */
  function initScenarioSelector() {
    const buttons = document.querySelectorAll('.scenario-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', function () {
        buttons.forEach((b) => b.classList.remove('active'));
        this.classList.add('active');
        const scenario = this.getAttribute('data-scenario');
        renderScenario(scenario);
      });
    });

    // Initial render
    renderScenario('hvac');
  }

  /**
   * Real-time Clock for Today's Activity Card
   */
  function initLiveClock() {
    const ticker = document.getElementById('live-time-ticker');
    if (!ticker) return;

    function updateTime() {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      ticker.textContent = `${String(hours).padStart(2, '0')}:${minutes} ${ampm} EST`;
    }

    updateTime();
    setInterval(updateTime, 30000);
  }

  /**
   * Active Nav Link on Scroll
   */
  function updateActiveNav() {
    const sections = ['hero', 'solutions', 'how-it-works', 'results', 'about', 'pricing', 'booking'];
    const scrollPos = window.scrollY + 200;

    for (const secId of sections) {
      const el = document.getElementById(secId);
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          navLinks.forEach((link) => {
            if (link.getAttribute('href') === `#${secId}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
          break;
        }
      }
    }
  }

  /**
   * Smooth Anchor Navigation
   */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href').substring(1);
        if (targetId === 'audit-modal') {
          return;
        }

        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  /**
   * Automation Audit Modal Open / Close Logic
   */
  function initModal() {
    const modal = document.getElementById('audit-modal');
    const openBtns = document.querySelectorAll('.open-audit-btn');
    const closeBtn = document.getElementById('close-audit-modal');

    if (!modal) return;

    function openModal(e) {
      if (e) e.preventDefault();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    openBtns.forEach((btn) => btn.addEventListener('click', openModal));
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });
  }

  /**
   * Audit Form Submission Handler
   */
  window.submitAuditForm = function () {
    const successMsg = document.getElementById('form-success-message');
    const submitBtn = document.querySelector('#audit-form button[type="submit"]');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
      submitBtn.innerHTML = '<span>Processing Request...</span>';
    }

    setTimeout(() => {
      if (submitBtn) {
        submitBtn.style.display = 'none';
      }
      if (successMsg) {
        successMsg.style.display = 'flex';
      }
    }, 800);
  };

  /**
   * Hero Pipeline Stage Cycling Animation (Highlight stages sequentially)
   */
  function initPipelineCycling() {
    const stages = [
      document.getElementById('stage-1'),
      document.getElementById('stage-2'),
      document.getElementById('stage-3'),
      document.getElementById('stage-4'),
      document.getElementById('stage-5')
    ].filter(Boolean);

    if (stages.length === 0) return;

    let currentIndex = 1;

    setInterval(() => {
      stages.forEach((st, idx) => {
        if (idx === currentIndex) {
          st.style.borderColor = 'rgba(249, 115, 22, 0.45)';
        } else if (idx !== 1 && idx !== 3) {
          st.style.borderColor = 'rgba(255, 255, 255, 0.06)';
        }
      });
      currentIndex = (currentIndex + 1) % stages.length;
    }, 3500);
  }

  // Event Listeners
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  // Initialize
  resizeCanvas();
  preloadAllFrames();
  initScenarioSelector();
  initLiveClock();
  initSmoothScroll();
  initModal();
  initPipelineCycling();
  requestAnimationFrame(animationLoop);
})();
