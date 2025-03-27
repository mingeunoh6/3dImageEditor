<script>
import {onMount} from 'svelte'
	import { fade, slide } from 'svelte/transition';
import Icon from '@iconify/svelte';


let {offPanel} = $props()




</script>




<main  transition:fade>
    <div class="title">
        Casting new model(building now...)
    </div>
    <div class="caster-basic-info-wrapper">
         <div class="caster-input">
        <span>Model name.</span>
        <input type="text" placeholder="ex) Susan">
    </div>
     <div class="caster-input">
        <span>Unique Code name.</span>
        <input type="text" placeholder="ex) aiSusan">
    </div>
    </div>
    <div class="train-list-wrapper">
          <div class="title">
        Model image & Caption
    </div>
    <div class="train-list">
<div class="train-item">
    <img />
    <textarea type="text" placeholder="ex) Image of the character called aiSusan"/>
</div>
    </div>
    </div>
   
    <div class="casting-btn-wrapper">
        <button>Start casting!</button>
    </div>

    <div class="close-btn" onclick={()=>offPanel()}>
    <Icon icon="carbon:close" width="24" height="24" />

    </div>
</main>




<style>
main{
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border: 1px solid var(--dim-color);
    background:var(--glass-background);
    position: absolute;
    display: flex;
    z-index: 999;
    color: var(--text-color-bright);
    flex-direction: column;
    padding: 10px;
    border: 1px solid var(--dim-color);
    border-radius: 12px;
    backdrop-filter: blur(3px);
}

.title{
    text-align: center;
    margin-bottom: 30px;
    font-size: 1rem;
    margin-top: 10px;
}

.caster-basic-info-wrapper{
    display: flex;
    flex-direction: row;
}
.caster-input{
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.caster-input input{
    background:none;
    border: 1px solid var(--dim-color);
    font-size: 0.9rem;
    height: 30px;
    color: var(--text-color-bright);
    padding: 4px 12px;
}

.train-item{
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    border: 1px solid var(--dim-color);
     height: 100px;
}

.train-item img{
     box-sizing: border-box;
    width: 100px;
    height: 100px;
}

.train-item textarea{
     box-sizing: border-box;
     font-size: 0.9rem;
  font-family:
		'Pretendard Variable',
		Pretendard,
		-apple-system,
		BlinkMacSystemFont,
		system-ui,
		Roboto,
		'Helvetica Neue',
		'Segoe UI',
		'Apple SD Gothic Neo',
		'Noto Sans KR',
		'Malgun Gothic',
		'Apple Color Emoji',
		'Segoe UI Emoji',
		'Segoe UI Symbol',
		sans-serif;
    flex-grow: 1;
    height: 100%;
    border: none;
    outline: none;
    resize: none;
    background: none;
padding: 10px;
overflow: auto;
color: var(--text-color-standard);
}


.casting-btn-wrapper{

height: 48px;
}

.casting-btn-wrapper button{
    display: flex;
justify-content: center;
align-items: center;
    width: 100%;
    height: 100%;
    border: 1px solid var(--dim-color);
    font-size: 1rem;
    cursor: pointer;
    transition: all ease-in-out 200ms;
}

.casting-btn-wrapper button:hover{
 background-color: var(--highlight-color);
}

.close-btn{
    position: absolute;
    right: 8px;
    top: 8px;
    z-index: 999;
    cursor: pointer;
}
</style>