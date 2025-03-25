<!-- VIEWPORT.svelte -->

<script>
    import { onMount, onDestroy } from 'svelte';
    import Icon from '@iconify/svelte';
    import * as THREE from 'three';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
    import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
    import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
    import { ObjectHighlighter, EdgeHighlighter } from '$lib/newcomp/elements/objectHighlighter.js';
    import { mainRenderer } from '$lib/newcomp/elements/main-canvas.js';
import { toBase64, toBlobURL, getImageDimensions, revokeBlobURL, getDimensionsFromRatio } from '$lib/utils/imageUtils';
    // Props from parent component
  let { 
        newModel, 
        doneLoadingModel = () => {}, 
        onModelError = () => {},
        onSceneObjectsChanged = () => {},
        currentViewportBG, 
    } = $props();

    
    // Component state
    let viewport;
    let viewportWidth = $state(0);
    let viewportHeight = $state(0);
    let isPortrait = $state(false);
    let viewportRenderer;
    let objectHighlighter;
    let edgeHighlighter;
    let aspectRatio = $state(1)
    let resizeObserver;


    // Model loading state
    let isLoading = $state(false);
    let loadingProgress = $state(0);
    let loadingStage = $state(''); // 'parsing', 'processing', 'textures'
    let currentModel = $state(null);
    let modelStats = $state({
        vertices: 0,
        triangles: 0,
        materials: 0
    });

    // Selection state
    let selectedObject = $state(null);
    let raycaster = $state(new THREE.Raycaster());
    let mouse = $state(new THREE.Vector2());
    let isMouseDown = $state(false);
    let isDragging = $state(false);
    let mouseDownPosition = $state(new THREE.Vector2());
    const DRAG_THRESHOLD = 5; // pixels

    // Context menu state
    let contextMenuVisible = $state(false);
    let contextMenuPosition = $state({ x: 0, y: 0 });
    let contextMenuOptions = $state([]);
    
    let sceneObjects = $state([])


    // Monitor new model changes from parent component
    $effect(() => {
        if (newModel) {
            loadModel(newModel);
        }
    });

    // Renderer configuration
    const rendererOptions = {
        useHDRI: true,
        hdriPath: '/hdri/brown_photostudio_02_1k.hdr',
        shadows: true,
        autoRotate: false,
        autoRotateSpeed: 0.5,
        exposure: 1.2
    };


  export function enablePathTracing(state) {
    if (!viewportRenderer) return;

    viewportRenderer.enablePathTracing(state).then(() => {
        console.log('Path tracing enabled:', state);
    }).catch((error) => {
        console.error('Error enabling path tracing:', error);
    });
}
   

    function updateSceneObjectsList() {
        if (!viewportRenderer) return;
        
        const objectsList = viewportRenderer.getObjectsInScene().map(obj => ({
            id: obj.id,
            name: obj.name || `Object_${obj.id.substring(0, 6)}`,
            type: determineObjectType(obj.object),
            visible: obj.object.visible !== false
        }));

        
        
        onSceneObjectsChanged(objectsList);
    }
    
// Helper function to determine object type
 function determineObjectType(object) {
        if (!object) return 'unknown';
        
        // Check filename for type hints
        if (object.userData && object.userData.filename) {
            const filename = object.userData.filename.toLowerCase();
            if (filename.includes('.glb') || filename.includes('.gltf')) {
                return 'gltf';
            }
        }
        
        // Check object structure
        let hasLights = false;
        let hasMeshes = false;
        
        object.traverse(child => {
            if (child.isLight) hasLights = true;
            if (child.isMesh) hasMeshes = true;
        });
        
        if (hasLights && !hasMeshes) return 'light';
        if (hasMeshes) return 'mesh';
        
        return 'object';
    }

  function updateCurrentBGinfo(texture) {
    // 부모 컴포넌트에 현재 배경 정보 업데이트
    currentViewportBG(texture.image);
    console.log('Current viewport background updated', texture.image);
}
  export async function changeBG(file) {
    if (!viewportRenderer) return;

    // 배경 제거 요청인 경우
    if (file === null) {
        viewportRenderer.resetHDRI();
        // 부모 컴포넌트에 현재 배경 정보 업데이트
        currentViewportBG(null);
        return;
    }
    
    try {
        // 렌더러를 통해 배경 로드 - 통합 메서드 사용
        const texture = await viewportRenderer.loadBackground(file, false, {
            setAsBackground: true,
            setAsEnvironment: true
        });
        
        // 로드된 텍스처에서 종횡비 업데이트
        if (texture && texture.image) {
            aspectRatio = texture.image.width / texture.image.height;
            setViewport();
            
            // 현재 뷰포트 배경 정보 업데이트
            updateCurrentBGinfo(texture);
        }
    } catch (error) {
        console.error('Error loading background:', error);
    }
}
   export async function changeBGfromURL(url) {
    if (!viewportRenderer) return;

    // URL이 없으면 기본 HDRI 재설정
    if (!url) {
        viewportRenderer.resetHDRI();
        aspectRatio = 1; // 종횡비 재설정
        setViewport();
        currentViewportBG(null);
        return;
    }
    
    try {
        // URL에서 배경 로드 - 통합 메서드 사용
        const texture = await viewportRenderer.loadBackground(url, true, {
            setAsBackground: true,
            setAsEnvironment: true
        });
        
        // 종횡비 업데이트
        if (texture && texture.image) {
            aspectRatio = texture.image.width / texture.image.height;
            setViewport();
            
            // 현재 뷰포트 배경 정보 업데이트
            updateCurrentBGinfo(texture);
        }
    } catch (error) {
        console.error('Error loading background from URL:', error);
    }
}


export async function renderCurrentViewportAsImg(data) {
    console.log('Getting current viewport as image', data);

    let currentImgWidth;
    let currentImgHeight;

    // 배경 이미지가 없는 경우 비율 정보 사용
    if (!data.currentBG) {
        console.log('Using ratio for dimensions');
        
        // 비율에 따른 표준 크기 가져오기
        const dimensions = getDimensionsFromRatio(data.currentRatio);
        currentImgWidth = dimensions.width;
        currentImgHeight = dimensions.height;
    } else {
        console.log('Using background image dimensions', data.currentBG);
        currentImgWidth = data.currentBG.width;
        currentImgHeight = data.currentBG.height;
    }

    // 스크린샷 생성
    const renderImg = await viewportRenderer.takeScreenshot(currentImgWidth, currentImgHeight);
    console.log('Screenshot generated');
    
    return renderImg;
}


export function resetBG(){
        if (!viewportRenderer) return;
    // Pass true to set as both environment and background
    viewportRenderer.resetHDRI();
}

// Add a public method to select objects by ID
  export function selectObjectById(objectId) {
    if (!viewportRenderer) return;
    
    // First, clear any existing selection
    viewportRenderer.clearHighlight();
    viewportRenderer.removeTransformControl();
    
    const objects = viewportRenderer.getObjectsInScene();
    const targetObject = objects.find(obj => obj.id === objectId);
    
    if (targetObject) {
        // Update selected object
        selectedObject = targetObject;
        
        // Highlight the object
        viewportRenderer.highlightObject(targetObject.object, {
            color: 0x00ff00
        });
        
        // Activate transform controls
        viewportRenderer.transformControlActivate(targetObject.object);
        
        // Optionally focus camera on object
        focusCameraOnObject(targetObject.object);
    }
}
// Toggle object visibility
  // Toggle object visibility - this is a public method
    export function toggleObjectVisibility(objectId) {
        if (!viewportRenderer) return;
        
        const objects = viewportRenderer.getObjectsInScene();
        const targetObject = objects.find(obj => obj.id === objectId);
        
        if (targetObject) {
            // Toggle visibility
            const isVisible = targetObject.object.visible;
            targetObject.object.visible = !isVisible;
            
            // If hiding the selected object, clear selection
            if (isVisible && selectedObject && selectedObject.id === objectId) {
                selectedObject = null;
                viewportRenderer.clearHighlight();
            }
            
            // Update scene objects list
            updateSceneObjectsList();
            
            // Render the scene
            viewportRenderer.render();
        }
    }

   // Delete an object by ID - this is a public method
    export function deleteObjectById(objectId) {
        if (!viewportRenderer) return;
        
        const objects = viewportRenderer.getObjectsInScene();
        const targetObject = objects.find(obj => obj.id === objectId);
        
        if (targetObject) {
            // If this is the selected object, clear selection
            if (selectedObject && selectedObject.id === objectId) {
                selectedObject = null;
                viewportRenderer.clearHighlight();
            }
            
            // Remove the object from the renderer
            viewportRenderer.removeObject(targetObject.object);
            
            // Update scene objects list
            updateSceneObjectsList();
            
            // Render the scene
            viewportRenderer.render();
        }
    }




// Focus camera on an object
  // Focus camera on an object - internal helper method
    function focusCameraOnObject(object) {
        if (!viewportRenderer || !viewportRenderer.controls) return;
        
        // Calculate object bounds
        const box = new THREE.Box3().setFromObject(object);
        
        // Skip if the object has no size (e.g., empty group)
        if (box.isEmpty()) return;
        
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Get max dimension for camera distance
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = viewportRenderer.camera.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2) * 1.5);
        
        // Smoothly move camera to new position
        const currentPos = viewportRenderer.camera.position.clone();
        
        // Position camera at a 45° angle to the object
        const targetPos = center.clone().add(
            new THREE.Vector3(cameraDistance * 0.7, cameraDistance * 0.7, cameraDistance * 0.7)
        );
        
        // Simple animation for camera movement
        const duration = 500; // ms
        const startTime = Date.now();
        
        function animateCamera() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = progress * (2 - progress); // Ease out
            
            viewportRenderer.camera.position.lerpVectors(currentPos, targetPos, easeProgress);
            viewportRenderer.controls.target.lerp(center, easeProgress);
            viewportRenderer.controls.update();
            
            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            }
        }
        
        animateCamera();
    }

    // Load 3D model from file
    async function loadModel(file) {
        if (!viewportRenderer) {
            const error = new Error('Viewport renderer not initialized');
            onModelError(error);
            return;
        }
        
        // Validate file
        if (!file || !(file instanceof File)) {
            const error = new Error('Invalid file input');
            onModelError(error);
            return;
        }

        // Start loading process
        isLoading = true;
        loadingProgress = 0;
        loadingStage = 'parsing';

        try {
            // Create object URL for the file
            const objectUrl = URL.createObjectURL(file);
            
            // Configure loaders
            const loader = new GLTFLoader();
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
            loader.setDRACOLoader(dracoLoader);

            // Track loading progress
            loader.setPath('');
            loader.setRequestHeader({});

            // Load the model with progress tracking
            const gltf = await new Promise((resolve, reject) => {
                loader.load(
                    objectUrl,
                    resolve,
                    (xhr) => {
                        if (xhr.lengthComputable) {
                            const progress = Math.round((xhr.loaded / xhr.total) * 100);
                            loadingProgress = progress;
                            
                            // Update loading stage based on progress
                            if (progress < 50) {
                                loadingStage = 'parsing';
                            } else if (progress < 90) {
                                loadingStage = 'processing';
                            } else {
                                loadingStage = 'textures';
                            }
                        }
                    },
                    (error) => {
                        console.error('GLTF loading error:', error);
                        reject(new Error(error.message || 'Failed to load 3D model'));
                    }
                );
            });

            // Clean up object URL
            URL.revokeObjectURL(objectUrl);

            // Validate scene before adding
            if (!gltf.scene) {
                throw new Error('No scene found in the model');
            }

            // Calculate model statistics
            const stats = calculateModelStats(gltf.scene);
            modelStats = stats;
            console.log('Model stats:', stats);

            // Add the new model to the scene
            currentModel = gltf.scene;
            viewportRenderer.addObject(currentModel, true, file.name);
            
            // Update the scene
            viewportRenderer.render();
            
            // Notify parent that loading is complete
            doneLoadingModel();
            updateSceneObjectsList();
        } catch (error) {
            console.error('Model loading error:', error);
            onModelError(error);
        } finally {
            // Reset loading state
            isLoading = false;
            loadingProgress = 0;
            loadingStage = '';
        }
    }

    // Calculate model statistics for information display
    function calculateModelStats(model) {
        let vertices = 0;
        let triangles = 0;
        let materials = new Set();
        
        model.traverse((node) => {
            if (node.isMesh) {
                const geometry = node.geometry;
                
                if (geometry) {
                    // Count vertices
                    if (geometry.attributes && geometry.attributes.position) {
                        vertices += geometry.attributes.position.count;
                    }
                    
                    // Count triangles/faces
                    if (geometry.index) {
                        triangles += geometry.index.count / 3;
                    } else if (geometry.attributes && geometry.attributes.position) {
                        triangles += geometry.attributes.position.count / 3;
                    }
                }
                
                // Track unique materials
                if (Array.isArray(node.material)) {
                    node.material.forEach(mat => materials.add(mat.uuid));
                } else if (node.material) {
                    materials.add(node.material.uuid);
                }
            }
        });
        
        return {
            vertices: Math.round(vertices),
            triangles: Math.round(triangles),
            materials: materials.size
        };
    }

    // Find the top parent group of an object that is not the scene
    function findTopParentGroup(object) {
        let current = object;
        let parent = object.parent;

        // Go up the hierarchy until we reach the scene or null
        while (parent && !(parent instanceof THREE.Scene)) {
            current = parent;
            parent = parent.parent;
        }

        return current;
    }

    // Delete the currently selected object
    function handleDeleteObject() {
        if (!selectedObject) return;

        // Remove the object from the renderer
        viewportRenderer.removeObject(selectedObject.object);

        // Clear selection and context menu
        selectedObject = null;
        contextMenuVisible = false;
        viewportRenderer.clearHighlight();
        updateSceneObjectsList();
    }
    
    // Handle mouse down event
    function handleMouseDown(event) {
        if (!viewportRenderer?.scene || !viewportRenderer?.camera) return;

        // Calculate mouse position
        const rect = viewport.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Store the initial mouse down position
        mouseDownPosition.x = event.clientX;
        mouseDownPosition.y = event.clientY;

        // Set mouse down state
        isMouseDown = true;
        isDragging = false;
        
        // Hide context menu when clicking elsewhere
        if (contextMenuVisible) {
            contextMenuVisible = false;
        }
    }
    
    // Handle mouse move event
    function handleMouseMove(event) {
        if (!isMouseDown) return;

        // Check if mouse has moved beyond drag threshold
        const dx = event.clientX - mouseDownPosition.x;
        const dy = event.clientY - mouseDownPosition.y;
        
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
            isDragging = true;
        }
    }

    // Handle mouse up event
    function handleMouseUp(event) {
        if (!viewportRenderer?.scene || !viewportRenderer?.camera) return;

        // If not dragging, perform object selection
        if (!isDragging) {
            const rect = viewport.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Use raycasting to find intersected objects
            raycaster.setFromCamera(mouse, viewportRenderer.camera);
                const intersects = raycaster.intersectObjects(
            viewportRenderer.scene.children, 
            true
        ).filter(intersect => {
            const obj = intersect.object;
            
            // Skip invisible objects
            if (!obj.visible) return false;
            
            // Skip non-mesh objects
            if (!obj.isMesh) return false;
            
            // Skip objects marked as not selectable (including ground)
            if (!isSelectable(obj)) return false;
            
            // Skip highlight objects
            if (obj.userData && obj.userData.isHighlight) return false;
            if (hasHighlightParent(obj)) return false;
            
            // Skip transform control objects
            if (
                hasTransformControlParent(obj) || 
                obj.type === "TransformControlsGizmo" || 
                obj.isTransformControlsPlane || 
                obj.isTransformControls ||
                obj.name?.includes('TransformControls')
            ) {
                return false;
            }
            
            return true;
        });
            if (intersects.length > 0) {
                // Get the closest visible mesh
                const selectedMesh = intersects[0].object;
                console.log(selectedMesh)
                // Find the top-level parent group
                const topGroup = findTopParentGroup(selectedMesh);
                console.log('top',topGroup)
                     
            // Extra safety check for transform controls
           if (
                !isSelectable(topGroup) ||
                topGroup.type === "TransformControlsGizmo" || 
                topGroup.isTransformControlsPlane || 
                topGroup.isTransformControls ||
                topGroup.name?.includes('TransformControls') ||
                hasTransformControlParent(topGroup)
            ) {
                return;
            }
                
                // Get scene objects for tracking
                const currentSceneObjects = viewportRenderer.getObjectsInScene();
                const currentSelectedObj = currentSceneObjects.find(obj => 
                    obj.object === topGroup || 
                    obj.object.getObjectById(topGroup.id)
                );
                
                // Set selection
                selectedObject = currentSelectedObj || { 
                    id: topGroup.id, 
                    name: topGroup.name || `Object_${topGroup.id}`, 
                    object: topGroup 
                };

                // Highlight the object
                viewportRenderer.highlightObject(topGroup, {
                    color: 0x00ff00
                });

                viewportRenderer.transformControlActivate(topGroup)
            } else {
                // Clear selection
                viewportRenderer.clearHighlight();
                viewportRenderer.removeTransformControl()
                selectedObject = null;
            }
        }

        // Reset mouse states
        isMouseDown = false;
        isDragging = false;
    }

    function hasTransformControlParent(object) {
    let current = object.parent;
    
    while (current) {
        if (
            current.type === "TransformControlsGizmo" || 
            current.isTransformControlsPlane || 
            current.isTransformControls ||
            current.name?.includes('TransformControls')
        ) {
            return true;
        }
        current = current.parent;
    }
    
    return false;
}

function isSelectable(object) {
    // Check if the object itself is marked as not selectable
    if (object.userData && (object.userData.notSelectable || object.userData.isGround)) {
        return false;
    }
    
    // Check if any parent is marked as not selectable
    let parent = object.parent;
    while (parent) {
        if (parent.userData && (parent.userData.notSelectable || parent.userData.isGround)) {
            return false;
        }
        parent = parent.parent;
    }
    
    return true;
}

function hasHighlightParent(object) {
    let current = object.parent;
    
    while (current) {
        if (current.userData && current.userData.isHighlight) {
            return true;
        }
        current = current.parent;
    }
    
    return false;
}

function isHighlightObject(object) {
    // Check if the object itself is marked as a highlight
    if (object.userData && object.userData.isHighlight) {
        return true;
    }
    
    // Check if any parent is a highlight group
    let parent = object.parent;
    while (parent) {
        if (parent.userData && parent.userData.isHighlight) {
            return true;
        }
        parent = parent.parent;
    }
    
    return false;
}

    // Handle touch events for mobile compatibility
    function handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        handleMouseDown({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    }

    function handleTouchMove(event) {
        event.preventDefault();
        const touch = event.touches[0];
        handleMouseMove({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    }

    function handleTouchEnd(event) {
        event.preventDefault();
        if (event.changedTouches.length > 0) {
            handleMouseUp({
                clientX: event.changedTouches[0].clientX,
                clientY: event.changedTouches[0].clientY
            });
        }
    }

    // Hide context menu
    function hideContextMenu() {
        contextMenuVisible = false;
    }

    // Handle right-click for context menu
 function handleRightClick(event) {
    // Prevent default context menu
    event.preventDefault();

    // Hide context menu if no object is selected
    if (!selectedObject) {
        hideContextMenu();
        return;
    }

    // Calculate mouse position
    const rect = viewport.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, viewportRenderer.camera);
    
    const intersects = raycaster.intersectObjects(
        viewportRenderer.scene.children, 
        true
    ).filter(intersect => {
        const obj = intersect.object;
        
        // Skip invisible objects
        if (!obj.visible) return false;
        
        // Skip non-mesh objects
        if (!obj.isMesh) return false;
        
        // Skip objects marked as not selectable (including ground)
        if (!isSelectable(obj)) return false;
        
        // Skip highlight objects
        if (obj.userData && obj.userData.isHighlight) return false;
        if (hasHighlightParent(obj)) return false;
        
        // Skip transform control objects
        if (hasTransformControlParent(obj)) return false;
        
        return true;
    });

    if (intersects.length > 0) {
        // Set available context menu options
        contextMenuOptions = [
            { id: 'delete', label: 'Delete Object', icon: 'carbon:trash-can', action: handleDeleteObject },
            // Add more options as needed
        ];
        
        // Show context menu at right-click position
        contextMenuPosition = { 
            x: event.clientX, 
            y: event.clientY 
        };
        contextMenuVisible = true;
    } else {
        // Hide context menu if right-click is not on a selectable object
        hideContextMenu();
    }
}


    // Handle viewport size based on orientation
   function setViewport() {
    if (!viewport || !viewport.parentElement) return;
    
    // Get the container's dimensions
    const container = viewport.parentElement;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Use 90% of container dimensions as maximum bounds
    const maxWidth = containerWidth * 0.9;
    const maxHeight = containerHeight * 0.9;
    
    // Check current container orientation
    isPortrait = containerHeight > containerWidth;
    
    // Calculate dimensions based on aspect ratio and available space
    if (aspectRatio === 1) {
        // Square image
        viewportWidth = Math.min(maxWidth, maxHeight);
        viewportHeight = viewportWidth;
    } else if (aspectRatio > 1) {
        // Landscape image (width > height)
        // First try to fit by width
        viewportWidth = maxWidth;
        viewportHeight = maxWidth / aspectRatio;
        
        // If too tall, constrain by height instead
        if (viewportHeight > maxHeight) {
            viewportHeight = maxHeight;
            viewportWidth = maxHeight * aspectRatio;
        }
    } else {
        // Portrait image (height > width)
        // First try to fit by height
        viewportHeight = maxHeight;
        viewportWidth = maxHeight * aspectRatio;
        
        // If too wide, constrain by width instead
        if (viewportWidth > maxWidth) {
            viewportWidth = maxWidth;
            viewportHeight = maxWidth / aspectRatio;
        }
    }
    
    // Apply calculated dimensions
    viewport.style.width = `${viewportWidth}px`;
    viewport.style.height = `${viewportHeight}px`;
    
    // Update renderer if it exists
    if (viewportRenderer) {
        viewportRenderer.resize();
    }
}

    // Component lifecycle hooks
    onMount(() => {

          function setVhVariable() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }


        // Initial setup
        setViewport();

        // Initialize the renderer
        viewportRenderer = new mainRenderer(viewport, rendererOptions);

        // Start animation loop
        viewportRenderer.animate();

        // Add resize event listener
        window.addEventListener('resize', setViewport);
           // Create ResizeObserver for container
     resizeObserver = new ResizeObserver(() => {
        setViewport();
    });

    // Start observing the container
    if (viewport?.parentElement) {
        resizeObserver.observe(viewport.parentElement);
    }
        
        // In Svelte 5, we should attach event handlers directly to the canvas element
        // instead of using addEventListener when possible
        
        // However, for canvas interactions, we may still need to use addEventListener
        // for certain cases like handling passive options properly
        viewport.onmousedown = handleMouseDown;
        viewport.onmousemove = handleMouseMove;
        viewport.onmouseup = handleMouseUp;
        
        // For touch events with passive: false, we still use addEventListener
        viewport.addEventListener('touchstart', handleTouchStart, { passive: false });
        viewport.addEventListener('touchmove', handleTouchMove, { passive: false });
        viewport.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        // Context menu handling
        viewport.oncontextmenu = handleRightClick;
   
    });

    onDestroy(() => {
        // Clean up resources
        if (objectHighlighter) {
            objectHighlighter.dispose();
        }
        
        if (edgeHighlighter) {
            edgeHighlighter.dispose();
        }

        // Clean up the renderer
        if (viewportRenderer) {
            viewportRenderer.dispose();
            viewportRenderer = null;
        }
        
        // // Remove event listeners
        // window.removeEventListener('resize', setViewport);
        if(resizeObserver){
            resizeObserver.disconnect();
        }
        // Clear direct event handlers
        if (viewport) {
            viewport.onmousedown = null;
            viewport.onmousemove = null;
            viewport.onmouseup = null;
            viewport.oncontextmenu = null;
            
            // Remove added event listeners
            viewport.removeEventListener('touchstart', handleTouchStart);
            viewport.removeEventListener('touchmove', handleTouchMove);
            viewport.removeEventListener('touchend', handleTouchEnd);
        }
    });
</script>

<div class="viewport-container">
    <canvas id="viewport" bind:this={viewport}></canvas>
    
    <!-- Context menu for selected objects -->
    {#if contextMenuVisible && selectedObject}
        <div 
            class="context-menu" 
            style="left: {contextMenuPosition.x}px; top: {contextMenuPosition.y}px;"
        >
            <ul>
                {#each contextMenuOptions as option}
                    <li>
                        <button onclick={option.action}>
                            {#if option.icon}
                                <Icon icon={option.icon} width="16" height="16" />
                            {/if}
                            {option.label}
                        </button>
                    </li>
                {/each}
            </ul>
        </div>
    {/if}
    
    <!-- Loading indicator -->
    {#if isLoading}
        <div class="loading-indicator">
            <div class="spinner"></div>
            <div class="loading-info">
                <span class="loading-stage">{loadingStage}</span>
                <div class="loading-progress">
                    <div class="progress-track">
                        <div class="progress-fill" style="width: {loadingProgress}%"></div>
                    </div>
                    <span class="progress-text">{loadingProgress}%</span>
                </div>
            </div>
        </div>
    {/if}
    
    <!-- Selected object info -->
    <!-- {#if selectedObject && !contextMenuVisible}
        <div class="object-info">
            <h3>{selectedObject.name || 'Selected Object'}</h3>
            <button class="close-btn" onclick={() => { selectedObject = null; viewportRenderer.clearHighlight(); }}>
                <Icon icon="carbon:close" width="16" height="16" />
            </button>
        </div>
    {/if} -->
    
    <!-- Model stats (visible when a model is loaded) -->
    {#if currentModel && modelStats.vertices > 0}
        <!-- <div class="model-stats">
            <span>Vertices: {modelStats.vertices.toLocaleString()}</span>
            <span>Triangles: {modelStats.triangles.toLocaleString()}</span>
            <span>Materials: {modelStats.materials}</span>
        </div> -->
    {/if}

    
    
    <!-- Debug info (can be removed in production) -->
    <!-- <div class="orientation-info">
        {isPortrait ? 'Portrait' : 'Landscape'} mode
    </div> -->
</div>

<style>
  .viewport-container {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;

  }

  #viewport {
    box-sizing: border-box;
    max-width: 100%;
    max-height: 100%;
    touch-action: none;
    border: 1px solid var(--dim-color);
    border-radius: 16px;
  }
    .orientation-info {
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10;
        pointer-events: none;
    }
    
    .model-stats {
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .loading-indicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        background: rgba(0, 0, 0, 0.8);
        padding: 24px;
        border-radius: 12px;
        z-index: 100;
        min-width: 240px;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s ease-in-out infinite;
        margin-bottom: 16px;
    }
    
    .loading-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
    }
    
    .loading-stage {
        text-transform: capitalize;
        margin-bottom: 8px;
    }
    
    .loading-progress {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 10px;
    }
    
    .progress-track {
        flex-grow: 1;
        height: 6px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        background-color: #4CAF50;
        transition: width 0.3s ease;
    }
    
    .progress-text {
        min-width: 40px;
        text-align: right;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
    
    .object-info {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 200px;
    }
    
    .object-info h3 {
        margin: 0;
        font-size: 14px;
        font-weight: normal;
    }
    
    .close-btn {
        background: none;
        border: none;
        color: white;
        opacity: 0.7;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .close-btn:hover {
        opacity: 1;
    }

    .context-menu {
        position: fixed;
        background-color: #18272E;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        padding: 8px;
        color: white;
        min-width: 160px;
        animation: fadeIn 0.15s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .context-menu ul {
        list-style-type: none;
        margin: 0;
        padding: 0;
    }

    .context-menu li {
        padding: 0;
    }

    .context-menu button {
        width: 100%;
        background: none;
        border: none;
        color: white;
        text-align: left;
        padding: 8px 16px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .context-menu button:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }


      /* 기존 스타일 뒤에 추가하세요 */
    .path-tracing-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.2);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100;
        pointer-events: none;
    }
    
    .progress-container {
        background-color: #18272E;
        border-radius: 8px;
        padding: 20px;
        width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        pointer-events: auto;
    }
    
    .progress-container h3 {
        color: white;
        margin-top: 0;
        margin-bottom: 12px;
        text-align: center;
    }
    
    .progress-bar-container {
        width: 100%;
        height: 8px;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
    }
    
    .progress-bar {
        height: 100%;
        background-color: #4CAF50;
        transition: width 0.3s ease;
    }
    
    .progress-info {
        display: flex;
        justify-content: space-between;
        color: white;
        font-size: 14px;
        margin-bottom: 12px;
    }
    
    .cancel-button {
        background-color: #333;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        width: 100%;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .cancel-button:hover {
        background-color: #555;
    }
</style>