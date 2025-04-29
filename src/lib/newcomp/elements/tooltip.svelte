<!-- lib/newcomp/elements/Tooltip.svelte -->
<script>
    // 툴팁 속성
    let {
        title = '',                // 툴팁 제목
        content = '',              // 텍스트 내용
        mediaType = 'none',        // 'video', 'image', 'none'
        mediaUrl = '',             // 비디오/이미지 URL
        position = 'bottom',       // 'top', 'right', 'bottom', 'left'
        width = 300,               // 툴팁 너비
        showCloseButton = true,    // 닫기 버튼 표시 여부
        autoplay = true,           // 비디오 자동 재생
        loop = true,               // 비디오 자동 반복
        delay = 0,                 // 보여주기 전 딜레이 (ms)
        duration = 0,              // 자동으로 사라지는 시간 (0=사라지지 않음)
        arrow = true,              // 화살표 표시 여부
        theme = 'dark',            // 'dark', 'light'
        onClose = () => {}         // 닫기 콜백
    } = $props();

    // 표시 상태
    let isVisible = $state(false);
    let timerId = $state(null);
    
    // 위치 계산
    let tooltipEl = $state(null);
    let arrowEl = $state(null);
    let tooltipPosition = $state({ top: 0, left: 0 });
    let arrowPosition = $state({ top: 0, left: 0 });
    
    // 툴팁을 표시하는 함수
    function show() {
        // 이미 표시 중이면 무시
        if (isVisible) return;
        
        // 딜레이가 있으면 타이머 설정
        if (delay > 0) {
            timerId = setTimeout(() => {
                isVisible = true;
                setAutoHideTimer();
            }, delay);
        } else {
            isVisible = true;
            setAutoHideTimer();
        }
    }
    
    // 툴팁을 숨기는 함수
    function hide() {
        isVisible = false;
        
        // 타이머 정리
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }
        
        // 닫기 콜백 호출
        onClose();
    }
    
    // 자동 숨김 타이머 설정
    function setAutoHideTimer() {
        if (duration > 0) {
            timerId = setTimeout(() => {
                hide();
            }, duration);
        }
    }
    
    // 툴팁 위치 계산 및 설정
    function updatePosition() {
        if (!tooltipEl || !tooltipEl.parentElement) return;
        
        // 부모 요소 크기와 위치
        const parentRect = tooltipEl.parentElement.getBoundingClientRect();
        const tooltipRect = tooltipEl.getBoundingClientRect();
        
        // 기본 위치 설정
        let top = 0;
        let left = 0;
        
        switch (position) {
            case 'top':
                top = -tooltipRect.height - 10;
                left = (parentRect.width - tooltipRect.width) / 2;
                break;
            case 'right':
                top = (parentRect.height - tooltipRect.height) / 2;
                left = parentRect.width + 10;
                break;
            case 'bottom':
                top = parentRect.height + 10;
                left = (parentRect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = (parentRect.height - tooltipRect.height) / 2;
                left = -tooltipRect.width - 10;
                break;
        }
        
        // 툴팁 위치 설정
        tooltipPosition = { top: `${top}px`, left: `${left}px` };
        
        // 화살표 위치 계산
        if (arrow && arrowEl) {
            let arrowTop = 0;
            let arrowLeft = 0;
            
            switch (position) {
                case 'top':
                    arrowTop = tooltipRect.height - 1;
                    arrowLeft = tooltipRect.width / 2 - 8;
                    break;
                case 'right':
                    arrowTop = tooltipRect.height / 2 - 8;
                    arrowLeft = -14;
                    break;
                case 'bottom':
                    arrowTop = -12;
                    arrowLeft = tooltipRect.width / 2 - 8;
                    break;
                case 'left':
                    arrowTop = tooltipRect.height / 2 - 8;
                    arrowLeft = tooltipRect.width - 4;
                    break;
            }
            
            arrowPosition = { top: `${arrowTop}px`, left: `${arrowLeft}px` };
        }
    }
    
    // 이펙트: 툴팁이 표시될 때 위치 업데이트
    $effect(() => {
        if (isVisible && tooltipEl) {
            updatePosition();
            
            // 윈도우 크기 변경 시 위치 재계산
            const handleResize = () => updatePosition();
            window.addEventListener('resize', handleResize);
            
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }
    });
    
    // 컴포넌트 노출 메서드
    function toggle() {
        isVisible ? hide() : show();
    }
    
    // 부모에 메서드 노출
    $effect(() => {
        if (tooltipEl && tooltipEl.parentElement) {
            tooltipEl.parentElement._tooltipApi = {
                show,
                hide,
                toggle
            };
        }
    });
</script>

<!-- 툴팁 컨테이너 -->
<div 
    class="tooltip-container {theme}"
    class:visible={isVisible}
    bind:this={tooltipEl}
    style="width: {width}px; {Object.entries(tooltipPosition).map(([k, v]) => `${k}:${v}`).join(';')}"
>
    <!-- 툴팁 콘텐츠 -->
    <div class="tooltip-content">
        {#if showCloseButton}
            <button class="close-btn" on:click={hide}>×</button>
        {/if}
        
        {#if title}
            <h3 class="tooltip-title">{title}</h3>
        {/if}
        
        {#if mediaType === 'video' && mediaUrl}
            <div class="media-container">
                <video 
                    src={mediaUrl} 
                    autoplay={autoplay} 
                    loop={loop}
                    muted 
                    playsinline
                    class="tooltip-media"
                ></video>
            </div>
        {/if}
        
        {#if mediaType === 'image' && mediaUrl}
            <div class="media-container">
                <img src={mediaUrl} alt={title} class="tooltip-media" />
            </div>
        {/if}
        
        {#if content}
            <p class="tooltip-text">{content}</p>
        {/if}
    </div>
    
    <!-- 화살표 -->
    {#if arrow}
        <div 
            class="tooltip-arrow {position}" 
            bind:this={arrowEl}
            style="{Object.entries(arrowPosition).map(([k, v]) => `${k}:${v}`).join(';')}"
        ></div>
    {/if}
</div>

<style>
    .tooltip-container {
        position: absolute;
        z-index: 1000;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s, visibility 0.3s;
        pointer-events: none;
        max-width: 90vw;
    }
    
    .tooltip-container.visible {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
    }
    
    .tooltip-container.dark {
        background-color: var(--primary-color, #1f1f1f);
        color: var(--text-color-bright, #ffffff);
        border: 1px solid var(--dim-color, #333333);
        backdrop-filter: blur(3px);
    }
    
    .tooltip-container.light {
        background-color: #ffffff;
        color: #333333;
        border: 1px solid #e0e0e0;
    }
    
    .tooltip-content {
        padding: 16px;
        position: relative;
    }
    
    .tooltip-title {
        margin: 0 0 12px 0;
        font-size: 1rem;
        font-weight: 600;
    }
    
    .tooltip-text {
        margin: 10px 0 0 0;
        font-size: 0.9rem;
        line-height: 1.5;
    }
    
    .close-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        color: inherit;
        opacity: 0.7;
        transition: opacity 0.2s;
        border-radius: 50%;
    }
    
    .close-btn:hover {
        opacity: 1;
        background-color: rgba(255, 255, 255, 0.1);
    }
    
    .media-container {
        width: 100%;
        margin-bottom: 12px;
        border-radius: 6px;
        overflow: hidden;
    }
    
    .tooltip-media {
        width: 100%;
        display: block;
        border-radius: 4px;
    }
    
    .tooltip-arrow {
        position: absolute;
        width: 16px;
        height: 16px;
        transform: rotate(45deg);
    }
    
    .tooltip-arrow.top {
        border-bottom: 1px solid var(--dim-color, #333);
        border-right: 1px solid var(--dim-color, #333);
        background-color: var(--primary-color, #1f1f1f);
    }
    
    .tooltip-arrow.right {
        border-bottom: 1px solid var(--dim-color, #333);
        border-left: 1px solid var(--dim-color, #333);
        background-color: var(--primary-color, #1f1f1f);
    }
    
    .tooltip-arrow.bottom {
        border-top: 1px solid var(--dim-color, #333);
        border-left: 1px solid var(--dim-color, #333);
        background-color: var(--primary-color, #1f1f1f);
    }
    
    .tooltip-arrow.left {
        border-top: 1px solid var(--dim-color, #333);
        border-right: 1px solid var(--dim-color, #333);
        background-color: var(--primary-color, #1f1f1f);
    }
    
    /* 라이트 테마 화살표 스타일 */
    .light .tooltip-arrow.top,
    .light .tooltip-arrow.right,
    .light .tooltip-arrow.bottom,
    .light .tooltip-arrow.left {
        background-color: #ffffff;
        border-color: #e0e0e0;
    }
</style>