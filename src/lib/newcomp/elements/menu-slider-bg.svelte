<script>
    // 기본 속성 정의
    let {
        value = 50,
        min = 0,
        max = 360,
        scale = 1,
        name = "BG Rotation",
        unit = "°",
        onValueChange = undefined
    } = $props();
    
    // DOM 요소 참조
    let sliderWrapperEl;
    let sliderFillEl;
    
    // 상태 변수
    let isDragging = $state(false);
    
    // 마우스 다운 이벤트 - 드래그 시작
    function onMouseDown(e) {
        // 이벤트 전파 방지
        e.stopPropagation();
        
        // 드래그 상태 활성화
        isDragging = true;
        
        // 슬라이더의 현재 위치 정보 계산
        updateValueFromEvent(e);
        
        // 텍스트 선택 방지
        document.body.style.userSelect = 'none';
        
        // 글로벌 이벤트 리스너 등록
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }
    
    // 마우스 이동 이벤트 - 드래그 중
    function onMouseMove(e) {
        if (!isDragging) return;
        
        // 현재 마우스 위치에 따라 값 업데이트
        updateValueFromEvent(e);
    }
    
    // 마우스 업 이벤트 - 드래그 종료
    function onMouseUp(e) {
        if (!isDragging) return;
        
        // 드래그 상태 비활성화
        isDragging = false;
        
        // 텍스트 선택 재활성화
        document.body.style.userSelect = '';
        
        // 글로벌 이벤트 리스너 제거
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    }
    
    // 클릭 이벤트 - 전파 방지만
    function onClick(e) {
        e.stopPropagation();
    }
    
    // 이벤트 위치에 따라 값 업데이트
    function updateValueFromEvent(e) {
        if (!sliderWrapperEl) return;
        
        // 슬라이더 사각형 영역 가져오기
        const rect = sliderWrapperEl.getBoundingClientRect();
        
        // 슬라이더 내에서의 상대적 X 위치 계산 (0~1 사이)
        let relativeX = (e.clientX - rect.left) / rect.width;
        
        // 범위 제한 (0~1 사이)
        relativeX = Math.max(0, Math.min(1, relativeX));
        
        // 최종 값 계산 (min~max 사이)
        const newValue = min + (max - min) * relativeX;
        
        // 값 업데이트 및 콜백 호출
        if (value !== newValue) {
            value = newValue;
            
            // 부모 컴포넌트에 알림
            if (onValueChange) {
                onValueChange(newValue);
            }
            
            // 슬라이더 채우기 업데이트
            updateSliderFill();
        }
    }
    
    // 슬라이더 채우기 시각적 업데이트
    function updateSliderFill() {
        if (sliderFillEl) {
            const fillPercentage = ((value - min) / (max - min)) * 100;
            sliderFillEl.style.width = `${fillPercentage}%`;
        }
    }
    
    // 값이 변경될 때 슬라이더 채우기 업데이트
    $effect(() => {
        updateSliderFill();
    });
    
    // 컴포넌트 정리
    $effect(() => {
        // cleanup function
        return () => {
            if (isDragging) {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            }
        };
    });
    
    // 표시할 값 포맷팅
    function formatValue(val) {
        if (scale < 0.1) {
            return val.toFixed(2);
        } else if (scale < 1) {
            return val.toFixed(1);
        } else {
            return Math.round(val);
        }
    }
</script>

<div 
    class="slider-wrapper" 
    bind:this={sliderWrapperEl}
    onmousedown={onMouseDown}
    onclick={onClick}
>
    <div class="slider-track"></div>
    <div class="slider-fill" bind:this={sliderFillEl}></div>
    <div class="slider-value">{name} {formatValue(value)} {unit}</div>
</div>

<style>
    .slider-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        cursor: ew-resize !important;
        touch-action: none;
        user-select: none;
    }
    
    .slider-track {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.4);
        pointer-events: none;
    }

    .slider-fill {
        position: absolute;
        top: 0;
        left: 0;
        width: 50%;
        height: 100%;
        background-color: var(--highlight-color);
        opacity: 0.5;
        pointer-events: none;
        /* 트랜지션 제거 - 완벽하게 즉각적인 반응을 위해 */
    }
    
    .slider-value {
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        color: var(--primary-color);
        font-size: 0.9rem;
        pointer-events: none;
    }
  
</style>