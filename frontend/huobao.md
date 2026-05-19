<html lang="zh-CN" class="dark"><head><style cssr-id="n-image">body > .n-image-container {
position: fixed;
}

.n-image-preview-container {

 position: fixed;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 display: flex;
 
}

.n-image-preview-overlay {

 z-index: -1;
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 background: rgba(0, 0, 0, .3);
 
}

.n-image-preview-overlay.fade-in-transition-enter-active {
  transition: all 0.2s cubic-bezier(.4, 0, .2, 1)!important;
}

.n-image-preview-overlay.fade-in-transition-leave-active {
  transition: all 0.2s cubic-bezier(.4, 0, .2, 1)!important;
}

.n-image-preview-overlay.fade-in-transition-enter-from, .n-image-preview-overlay.fade-in-transition-leave-to {
  opacity: 0;
}

.n-image-preview-overlay.fade-in-transition-leave-from, .n-image-preview-overlay.fade-in-transition-enter-to {
  opacity: 1;
}

.n-image-preview-toolbar {

 z-index: 1;
 position: absolute;
 left: 50%;
 transform: translateX(-50%);
 border-radius: var(--n-toolbar-border-radius);
 height: 48px;
 bottom: 40px;
 padding: 0 12px;
 background: var(--n-toolbar-color);
 box-shadow: var(--n-toolbar-box-shadow);
 color: var(--n-toolbar-icon-color);
 transition: color .3s var(--n-bezier);
 display: flex;
 align-items: center;
 
}

.n-image-preview-toolbar .n-base-icon {

 padding: 0 8px;
 font-size: 28px;
 cursor: pointer;
 
}

.n-image-preview-toolbar.fade-in-transition-enter-active {
  transition: all 0.2s cubic-bezier(.4, 0, .2, 1)!important;
}

.n-image-preview-toolbar.fade-in-transition-leave-active {
  transition: all 0.2s cubic-bezier(.4, 0, .2, 1)!important;
}

.n-image-preview-toolbar.fade-in-transition-enter-from, .n-image-preview-toolbar.fade-in-transition-leave-to {
  opacity: 0;
}

.n-image-preview-toolbar.fade-in-transition-leave-from, .n-image-preview-toolbar.fade-in-transition-enter-to {
  opacity: 1;
}

.n-image-preview-wrapper {

 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 display: flex;
 pointer-events: none;
 
}

.n-image-preview-wrapper.fade-in-scale-up-transition-leave-active {
  transform-origin: inherit;
  transition: opacity .2s cubic-bezier(.4, 0, 1, 1), transform .2s cubic-bezier(.4, 0, 1, 1) ;
}

.n-image-preview-wrapper.fade-in-scale-up-transition-enter-active {
  transform-origin: inherit;
  transition: opacity .2s cubic-bezier(0, 0, .2, 1), transform .2s cubic-bezier(0, 0, .2, 1) ;
}

.n-image-preview-wrapper.fade-in-scale-up-transition-enter-from, .n-image-preview-wrapper.fade-in-scale-up-transition-leave-to {
  opacity: 0;
  transform:  scale(.9);
}

.n-image-preview-wrapper.fade-in-scale-up-transition-leave-from, .n-image-preview-wrapper.fade-in-scale-up-transition-enter-to {
  opacity: 1;
  transform:  scale(1);
}

.n-image-preview {

 user-select: none;
 -webkit-user-select: none;
 pointer-events: all;
 margin: auto;
 max-height: calc(100vh - 32px);
 max-width: calc(100vw - 32px);
 transition: transform .3s var(--n-bezier);
 
}

.n-image {

 display: inline-flex;
 max-height: 100%;
 max-width: 100%;
 
}

.n-image:not(.n-image--preview-disabled) {

 cursor: pointer;
 
}

.n-image img {

 border-radius: inherit;
 
}</style><style cssr-id="n-base-loading">@keyframes rotator {

 0% {
 -webkit-transform: rotate(0deg);
 transform: rotate(0deg);
 }
 100% {
 -webkit-transform: rotate(360deg);
 transform: rotate(360deg);
 }
}

.n-base-loading {

 position: relative;
 line-height: 0;
 width: 1em;
 height: 1em;
 
}

.n-base-loading .n-base-loading__transition-wrapper {

 position: absolute;
 width: 100%;
 height: 100%;
 
}

.n-base-loading .n-base-loading__transition-wrapper.icon-switch-transition-enter-from, .n-base-loading .n-base-loading__transition-wrapper.icon-switch-transition-leave-to {
  transform:  scale(0.75);
  left: 0;
  top: 0;
  opacity: 0;
}

.n-base-loading .n-base-loading__transition-wrapper.icon-switch-transition-enter-to, .n-base-loading .n-base-loading__transition-wrapper.icon-switch-transition-leave-from {
  transform: scale(1) ;
  left: 0;
  top: 0;
  opacity: 1;
}

.n-base-loading .n-base-loading__transition-wrapper.icon-switch-transition-enter-active, .n-base-loading .n-base-loading__transition-wrapper.icon-switch-transition-leave-active {
  transform-origin: center;
  position: absolute;
  left: 0;
  top: 0;
  transition: all .3s cubic-bezier(.4, 0, .2, 1) !important;
}

.n-base-loading .n-base-loading__placeholder {

 position: absolute;
 left: 50%;
 top: 50%;
 transform: translateX(-50%) translateY(-50%);
 
}

.n-base-loading .n-base-loading__placeholder.icon-switch-transition-enter-from, .n-base-loading .n-base-loading__placeholder.icon-switch-transition-leave-to {
  transform: translateX(-50%) translateY(-50%) scale(0.75);
  left: 50%;
  top: 50%;
  opacity: 0;
}

.n-base-loading .n-base-loading__placeholder.icon-switch-transition-enter-to, .n-base-loading .n-base-loading__placeholder.icon-switch-transition-leave-from {
  transform: scale(1) translateX(-50%) translateY(-50%);
  left: 50%;
  top: 50%;
  opacity: 1;
}

.n-base-loading .n-base-loading__placeholder.icon-switch-transition-enter-active, .n-base-loading .n-base-loading__placeholder.icon-switch-transition-leave-active {
  transform-origin: center;
  position: absolute;
  left: 50%;
  top: 50%;
  transition: all .3s cubic-bezier(.4, 0, .2, 1) !important;
}

.n-base-loading .n-base-loading__container {

 animation: rotator 3s linear infinite both;
 
}

.n-base-loading .n-base-loading__container .n-base-loading__icon {

 height: 1em;
 width: 1em;
 
}</style><style cssr-id="n-spin">@keyframes spin-rotate {

 from {
 transform: rotate(0);
 }
 to {
 transform: rotate(360deg);
 }
 
}

.n-spin-container {

 position: relative;
 
}

.n-spin-container .n-spin-body {

 position: absolute;
 top: 50%;
 left: 50%;
 transform: translateX(-50%) translateY(-50%);
 
}

.n-spin-container .n-spin-body.fade-in-transition-enter-active {
  transition: all 0.2s cubic-bezier(.4, 0, .2, 1)!important;
}

.n-spin-container .n-spin-body.fade-in-transition-leave-active {
  transition: all 0.2s cubic-bezier(.4, 0, .2, 1)!important;
}

.n-spin-container .n-spin-body.fade-in-transition-enter-from, .n-spin-container .n-spin-body.fade-in-transition-leave-to {
  opacity: 0;
}

.n-spin-container .n-spin-body.fade-in-transition-leave-from, .n-spin-container .n-spin-body.fade-in-transition-enter-to {
  opacity: 1;
}

.n-spin-body {

 display: inline-flex;
 align-items: center;
 justify-content: center;
 flex-direction: column;
 
}

.n-spin {

 display: inline-flex;
 height: var(--n-size);
 width: var(--n-size);
 font-size: var(--n-size);
 color: var(--n-color);
 
}

.n-spin.n-spin--rotate {

 animation: spin-rotate 2s linear infinite;
 
}

.n-spin-description {

 display: inline-block;
 font-size: var(--n-font-size);
 color: var(--n-text-color);
 transition: color .3s var(--n-bezier);
 margin-top: 8px;
 
}

.n-spin-content {

 opacity: 1;
 transition: opacity .3s var(--n-bezier);
 pointer-events: all;
 
}

.n-spin-content.n-spin-content--spinning {

 user-select: none;
 -webkit-user-select: none;
 pointer-events: none;
 opacity: var(--n-opacity-spinning);
 
}</style><style cssr-id="n-carousel">.n-carousel {

 position: relative;
 width: 100%;
 height: 100%;
 touch-action: pan-y;
 overflow: hidden;

}

.n-carousel .n-carousel__slides {

 display: flex;
 width: 100%;
 height: 100%;
 transition-timing-function: var(--n-bezier);
 transition-property: transform;
 
}

.n-carousel .n-carousel__slides .n-carousel__slide {

 flex-shrink: 0;
 position: relative;
 width: 100%;
 height: 100%;
 outline: none;
 overflow: hidden;
 
}

.n-carousel .n-carousel__slides .n-carousel__slide > img {

 display: block;
 
}

.n-carousel .n-carousel__dots {

 position: absolute;
 display: flex;
 flex-wrap: nowrap;
 
}

.n-carousel .n-carousel__dots.n-carousel__dots--dot .n-carousel__dot {

 height: var(--n-dot-size);
 width: var(--n-dot-size);
 background-color: var(--n-dot-color);
 border-radius: 50%;
 cursor: pointer;
 transition:
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 outline: none;
 
}

.n-carousel .n-carousel__dots.n-carousel__dots--dot .n-carousel__dot:focus {

 background-color: var(--n-dot-color-focus);
 
}

.n-carousel .n-carousel__dots.n-carousel__dots--dot .n-carousel__dot.n-carousel__dot--active {

 background-color: var(--n-dot-color-active);
 
}

.n-carousel .n-carousel__dots.n-carousel__dots--line .n-carousel__dot {

 border-radius: 9999px;
 width: var(--n-dot-line-width);
 height: 4px;
 background-color: var(--n-dot-color);
 cursor: pointer;
 transition:
 width .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 outline: none;
 
}

.n-carousel .n-carousel__dots.n-carousel__dots--line .n-carousel__dot:focus {

 background-color: var(--n-dot-color-focus);
 
}

.n-carousel .n-carousel__dots.n-carousel__dots--line .n-carousel__dot.n-carousel__dot--active {

 width: var(--n-dot-line-width-active);
 background-color: var(--n-dot-color-active);
 
}

.n-carousel .n-carousel__arrow {

 transition: background-color .3s var(--n-bezier);
 cursor: pointer;
 height: 28px;
 width: 28px;
 display: flex;
 align-items: center;
 justify-content: center;
 background-color: rgba(255, 255, 255, .2);
 color: var(--n-arrow-color);
 border-radius: 8px;
 user-select: none;
 -webkit-user-select: none;
 font-size: 18px;
 
}

.n-carousel .n-carousel__arrow svg {

 height: 1em;
 width: 1em;
 
}

.n-carousel .n-carousel__arrow:hover {

 background-color: rgba(255, 255, 255, .3);
 
}

.n-carousel.n-carousel--vertical {

 touch-action: pan-x;
 
}

.n-carousel.n-carousel--vertical .n-carousel__slides {

 flex-direction: column;
 
}

.n-carousel.n-carousel--vertical.n-carousel--fade .n-carousel__slide {

 top: 50%;
 left: unset;
 transform: translateY(-50%);
 
}

.n-carousel.n-carousel--vertical.n-carousel--card .n-carousel__slide {

 top: 50%;
 left: unset;
 transform: translateY(-50%) translateZ(-400px);
 
}

.n-carousel.n-carousel--vertical.n-carousel--card .n-carousel__slide.n-carousel__slide--current {

 transform: translateY(-50%) translateZ(0);
 
}

.n-carousel.n-carousel--vertical.n-carousel--card .n-carousel__slide.n-carousel__slide--prev {

 transform: translateY(-100%) translateZ(-200px);
 
}

.n-carousel.n-carousel--vertical.n-carousel--card .n-carousel__slide.n-carousel__slide--next {

 transform: translateY(0%) translateZ(-200px);
 
}

.n-carousel.n-carousel--usercontrol .n-carousel__slides > div {

 position: absolute;
 top: 50%;
 left: 50%;
 width: 100%;
 height: 100%;
 transform: translate(-50%, -50%);
 
}

.n-carousel.n-carousel--left .n-carousel__dots {

 transform: translateY(-50%);
 top: 50%;
 left: 12px;
 flex-direction: column;
 
}

.n-carousel.n-carousel--left .n-carousel__dots.n-carousel__dots--line .n-carousel__dot {

 width: 4px;
 height: var(--n-dot-line-width);
 margin: 4px 0;
 transition:
 height .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 outline: none;
 
}

.n-carousel.n-carousel--left .n-carousel__dots.n-carousel__dots--line .n-carousel__dot.n-carousel__dot--active {

 height: var(--n-dot-line-width-active);
 
}

.n-carousel.n-carousel--left .n-carousel__dot {

 margin: 4px 0;
 
}

.n-carousel .n-carousel__arrow-group {

 position: absolute;
 display: flex;
 flex-wrap: nowrap;
 
}

.n-carousel.n-carousel--vertical .n-carousel__arrow {

 transform: rotate(90deg);
 
}

.n-carousel.n-carousel--show-arrow.n-carousel--bottom .n-carousel__dots {

 transform: translateX(0);
 bottom: 18px;
 left: 18px;
 
}

.n-carousel.n-carousel--show-arrow.n-carousel--top .n-carousel__dots {

 transform: translateX(0);
 top: 18px;
 left: 18px;
 
}

.n-carousel.n-carousel--show-arrow.n-carousel--left .n-carousel__dots {

 transform: translateX(0);
 top: 18px;
 left: 18px;
 
}

.n-carousel.n-carousel--show-arrow.n-carousel--right .n-carousel__dots {

 transform: translateX(0);
 top: 18px;
 right: 18px;
 
}

.n-carousel.n-carousel--left .n-carousel__arrow-group {

 bottom: 12px;
 left: 12px;
 flex-direction: column;
 
}

.n-carousel.n-carousel--left .n-carousel__arrow-group > *:first-child {

 margin-bottom: 12px;
 
}

.n-carousel.n-carousel--right .n-carousel__dots {

 transform: translateY(-50%);
 top: 50%;
 right: 12px;
 flex-direction: column;
 
}

.n-carousel.n-carousel--right .n-carousel__dots.n-carousel__dots--line .n-carousel__dot {

 width: 4px;
 height: var(--n-dot-line-width);
 margin: 4px 0;
 transition:
 height .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 outline: none;
 
}

.n-carousel.n-carousel--right .n-carousel__dots.n-carousel__dots--line .n-carousel__dot.n-carousel__dot--active {

 height: var(--n-dot-line-width-active);
 
}

.n-carousel.n-carousel--right .n-carousel__dot {

 margin: 4px 0;
 
}

.n-carousel.n-carousel--right .n-carousel__arrow-group {

 bottom: 12px;
 right: 12px;
 flex-direction: column;
 
}

.n-carousel.n-carousel--right .n-carousel__arrow-group > *:first-child {

 margin-bottom: 12px;
 
}

.n-carousel.n-carousel--top .n-carousel__dots {

 transform: translateX(-50%);
 top: 12px;
 left: 50%;
 
}

.n-carousel.n-carousel--top .n-carousel__dots.n-carousel__dots--line .n-carousel__dot {

 margin: 0 4px;
 
}

.n-carousel.n-carousel--top .n-carousel__dot {

 margin: 0 4px;
 
}

.n-carousel.n-carousel--top .n-carousel__arrow-group {

 top: 12px;
 right: 12px;
 
}

.n-carousel.n-carousel--top .n-carousel__arrow-group > *:first-child {

 margin-right: 12px;
 
}

.n-carousel.n-carousel--bottom .n-carousel__dots {

 transform: translateX(-50%);
 bottom: 12px;
 left: 50%;
 
}

.n-carousel.n-carousel--bottom .n-carousel__dots.n-carousel__dots--line .n-carousel__dot {

 margin: 0 4px;
 
}

.n-carousel.n-carousel--bottom .n-carousel__dot {

 margin: 0 4px;
 
}

.n-carousel.n-carousel--bottom .n-carousel__arrow-group {

 bottom: 12px;
 right: 12px;
 
}

.n-carousel.n-carousel--bottom .n-carousel__arrow-group > *:first-child {

 margin-right: 12px;
 
}

.n-carousel.n-carousel--fade .n-carousel__slide {

 position: absolute;
 opacity: 0;
 transition-property: opacity;
 pointer-events: none;
 
}

.n-carousel.n-carousel--fade .n-carousel__slide.n-carousel__slide--current {

 opacity: 1;
 pointer-events: auto;
 
}

.n-carousel.n-carousel--card .n-carousel__slides {

 perspective: 1000px;
 
}

.n-carousel.n-carousel--card .n-carousel__slide {

 position: absolute;
 left: 50%;
 opacity: 0;
 transform: translateX(-50%) translateZ(-400px);
 transition-property: opacity, transform;
 
}

.n-carousel.n-carousel--card .n-carousel__slide.n-carousel__slide--current {

 opacity: 1;
 transform: translateX(-50%) translateZ(0);
 z-index: 1;
 
}

.n-carousel.n-carousel--card .n-carousel__slide.n-carousel__slide--prev {

 opacity: 0.4;
 transform: translateX(-100%) translateZ(-200px);
 
}

.n-carousel.n-carousel--card .n-carousel__slide.n-carousel__slide--next {

 opacity: 0.4;
 transform: translateX(0%) translateZ(-200px);
 
}</style><style cssr-id="n-upload">.n-upload {
width: 100%;
}

.n-upload.n-upload--dragger-inside .n-upload-trigger {

 display: block;
 
}

.n-upload.n-upload--drag-over .n-upload-dragger {

 border: var(--n-dragger-border-hover);
 
}

.n-upload-dragger {

 cursor: pointer;
 box-sizing: border-box;
 width: 100%;
 text-align: center;
 border-radius: var(--n-border-radius);
 padding: 24px;
 opacity: 1;
 transition:
 opacity .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 background-color: var(--n-dragger-color);
 border: var(--n-dragger-border);
 
}

.n-upload-dragger:hover {

 border: var(--n-dragger-border-hover);
 
}

.n-upload-dragger.n-upload-dragger--disabled {

 cursor: not-allowed;
 
}

.n-upload-trigger {

 display: inline-block;
 box-sizing: border-box;
 opacity: 1;
 transition: opacity .3s var(--n-bezier);
 
}

.n-upload-trigger + .n-upload-file-list {
margin-top: 8px;
}

.n-upload-trigger.n-upload-trigger--disabled {

 opacity: var(--n-item-disabled-opacity);
 cursor: not-allowed;
 
}

.n-upload-trigger.n-upload-trigger--image-card {

 width: 96px;
 height: 96px;
 
}

.n-upload-trigger.n-upload-trigger--image-card .n-base-icon {

 font-size: 24px;
 
}

.n-upload-trigger.n-upload-trigger--image-card .n-upload-dragger {

 padding: 0;
 height: 100%;
 width: 100%;
 display: flex;
 align-items: center;
 justify-content: center;
 
}

.n-upload-file-list {

 line-height: var(--n-line-height);
 opacity: 1;
 transition: opacity .3s var(--n-bezier);
 
}

.n-upload-file-list a, .n-upload-file-list img {
outline: none;
}

.n-upload-file-list.n-upload-file-list--disabled {

 opacity: var(--n-item-disabled-opacity);
 cursor: not-allowed;
 
}

.n-upload-file-list.n-upload-file-list--disabled .n-upload-file {
cursor: not-allowed;
}

.n-upload-file-list.n-upload-file-list--grid {

 display: grid;
 grid-template-columns: repeat(auto-fill, 96px);
 grid-gap: 8px;
 margin-top: 0;
 
}

.n-upload-file-list .n-upload-file {

 display: block;
 box-sizing: border-box;
 cursor: default;
 padding: 0px 12px 0 6px;
 transition: background-color .3s var(--n-bezier);
 border-radius: var(--n-border-radius);
 
}

.n-upload-file-list .n-upload-file.fade-in-height-expand-transition-leave-from, .n-upload-file-list .n-upload-file.fade-in-height-expand-transition-enter-to {
  opacity: 1;
}

.n-upload-file-list .n-upload-file.fade-in-height-expand-transition-leave-to, .n-upload-file-list .n-upload-file.fade-in-height-expand-transition-enter-from {
  opacity: 0;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

.n-upload-file-list .n-upload-file.fade-in-height-expand-transition-leave-active {

 overflow: hidden;
 transition:
 max-height .3s cubic-bezier(.4, 0, .2, 1) 0s,
 opacity .3s cubic-bezier(0, 0, .2, 1) 0s,
 margin-top .3s cubic-bezier(.4, 0, .2, 1) 0s,
 margin-bottom .3s cubic-bezier(.4, 0, .2, 1) 0s,
 padding-top .3s cubic-bezier(.4, 0, .2, 1) 0s,
 padding-bottom .3s cubic-bezier(.4, 0, .2, 1) 0s
 
 
}

.n-upload-file-list .n-upload-file.fade-in-height-expand-transition-enter-active {

 overflow: hidden;
 transition:
 max-height .3s cubic-bezier(.4, 0, .2, 1),
 opacity .3s cubic-bezier(.4, 0, 1, 1),
 margin-top .3s cubic-bezier(.4, 0, .2, 1),
 margin-bottom .3s cubic-bezier(.4, 0, .2, 1),
 padding-top .3s cubic-bezier(.4, 0, .2, 1),
 padding-bottom .3s cubic-bezier(.4, 0, .2, 1)
 
 
}

.n-upload-file-list .n-upload-file .n-progress.fade-in-height-expand-transition-leave-from, .n-upload-file-list .n-upload-file .n-progress.fade-in-height-expand-transition-enter-to {
  opacity: 1;
}

.n-upload-file-list .n-upload-file .n-progress.fade-in-height-expand-transition-leave-to, .n-upload-file-list .n-upload-file .n-progress.fade-in-height-expand-transition-enter-from {
  opacity: 0;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.n-upload-file-list .n-upload-file .n-progress.fade-in-height-expand-transition-leave-active {

 overflow: hidden;
 transition:
 max-height .3s cubic-bezier(.4, 0, .2, 1) 0s,
 opacity .3s cubic-bezier(0, 0, .2, 1) 0s,
 margin-top .3s cubic-bezier(.4, 0, .2, 1) 0s,
 margin-bottom .3s cubic-bezier(.4, 0, .2, 1) 0s,
 padding-top .3s cubic-bezier(.4, 0, .2, 1) 0s,
 padding-bottom .3s cubic-bezier(.4, 0, .2, 1) 0s
 
 
}

.n-upload-file-list .n-upload-file .n-progress.fade-in-height-expand-transition-enter-active {

 overflow: hidden;
 transition:
 max-height .3s cubic-bezier(.4, 0, .2, 1),
 opacity .3s cubic-bezier(.4, 0, 1, 1),
 margin-top .3s cubic-bezier(.4, 0, .2, 1),
 margin-bottom .3s cubic-bezier(.4, 0, .2, 1),
 padding-top .3s cubic-bezier(.4, 0, .2, 1),
 padding-bottom .3s cubic-bezier(.4, 0, .2, 1)
 
 
}

.n-upload-file-list .n-upload-file:hover {

 background-color: var(--n-item-color-hover);
 
}

.n-upload-file-list .n-upload-file:hover .n-upload-file-info .n-upload-file-info__action {

 opacity: 1;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--image-type {

 border-radius: var(--n-border-radius);
 text-decoration: underline;
 text-decoration-color: #0000;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--image-type .n-upload-file-info {

 padding-top: 0px;
 padding-bottom: 0px;
 width: 100%;
 height: 100%;
 display: flex;
 justify-content: space-between;
 align-items: center;
 padding: 6px 0;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--image-type .n-upload-file-info .n-progress {

 padding: 2px 0;
 margin-bottom: 0;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--image-type .n-upload-file-info .n-upload-file-info__name {

 padding: 0 8px;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--image-type .n-upload-file-info .n-upload-file-info__thumbnail {

 width: 32px;
 height: 32px;
 font-size: 28px;
 display: flex;
 justify-content: center;
 align-items: center;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--image-type .n-upload-file-info .n-upload-file-info__thumbnail img {

 width: 100%;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--text-type .n-progress {

 box-sizing: border-box;
 padding-bottom: 6px;
 margin-bottom: 6px;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--image-card-type {

 position: relative;
 width: 96px;
 height: 96px;
 border: var(--n-item-border-image-card);
 border-radius: var(--n-border-radius);
 padding: 0;
 display: flex;
 align-items: center;
 justify-content: center;
 transition: border-color .3s var(--n-bezier), background-color .3s var(--n-bezier);
 border-radius: var(--n-border-radius);
 overflow: hidden;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--image-card-type .n-progress {

 position: absolute;
 left: 8px;
 bottom: 8px;
 right: 8px;
 width: unset;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--image-card-type .n-upload-file-info {

 padding: 0;
 width: 100%;
 height: 100%;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--image-card-type .n-upload-file-info .n-upload-file-info__thumbnail {

 width: 100%;
 height: 100%;
 display: flex;
 flex-direction: column;
 align-items: center;
 justify-content: center;
 font-size: 36px;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--image-card-type .n-upload-file-info .n-upload-file-info__thumbnail img {

 width: 100%;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--image-card-type::before {

 position: absolute;
 z-index: 1;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 border-radius: inherit;
 opacity: 0;
 transition: opacity .2s var(--n-bezier);
 content: "";
 
}

.n-upload-file-list .n-upload-file.n-upload-file--image-card-type:hover::before {
opacity: 1;
}

.n-upload-file-list .n-upload-file.n-upload-file--image-card-type:hover .n-upload-file-info .n-upload-file-info__thumbnail {
opacity: .12;
}

.n-upload-file-list .n-upload-file.n-upload-file--error-status:hover {

 background-color: var(--n-item-color-hover-error);
 
}

.n-upload-file-list .n-upload-file.n-upload-file--error-status .n-upload-file-info .n-upload-file-info__name {
color: var(--n-item-text-color-error);
}

.n-upload-file-list .n-upload-file.n-upload-file--error-status .n-upload-file-info .n-upload-file-info__thumbnail {
color: var(--n-item-text-color-error);
}

.n-upload-file-list .n-upload-file.n-upload-file--error-status.n-upload-file--image-card-type {

 border: var(--n-item-border-image-card-error);
 
}

.n-upload-file-list .n-upload-file.n-upload-file--with-url {

 cursor: pointer;
 
}

.n-upload-file-list .n-upload-file.n-upload-file--with-url .n-upload-file-info .n-upload-file-info__name {

 color: var(--n-item-text-color-success);
 text-decoration-color: var(--n-item-text-color-success);
 
}

.n-upload-file-list .n-upload-file.n-upload-file--with-url .n-upload-file-info .n-upload-file-info__name a {

 text-decoration: underline;
 
}

.n-upload-file-list .n-upload-file .n-upload-file-info {

 position: relative;
 padding-top: 6px;
 padding-bottom: 6px;
 display: flex;
 flex-wrap: nowrap;
 
}

.n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__thumbnail {

 font-size: 18px;
 opacity: 1;
 transition: opacity .2s var(--n-bezier);
 color: var(--n-item-icon-color);
 
}

.n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__thumbnail .n-base-icon {

 margin-right: 2px;
 vertical-align: middle;
 transition: color .3s var(--n-bezier);
 
}

.n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__action {

 padding-top: inherit;
 padding-bottom: inherit;
 position: absolute;
 right: 0;
 top: 0;
 bottom: 0;
 width: 80px;
 display: flex;
 align-items: center;
 transition: opacity .2s var(--n-bezier);
 justify-content: flex-end;
 opacity: 0;
 
}

.n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__action .n-button:not(:last-child) {
  margin-right: 4px;
}

.n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__action .n-button .n-base-icon svg.icon-switch-transition-enter-from, .n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__action .n-button .n-base-icon svg.icon-switch-transition-leave-to {
  transform:  scale(0.75);
  left: 0;
  top: 0;
  opacity: 0;
}

.n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__action .n-button .n-base-icon svg.icon-switch-transition-enter-to, .n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__action .n-button .n-base-icon svg.icon-switch-transition-leave-from {
  transform: scale(1) ;
  left: 0;
  top: 0;
  opacity: 1;
}

.n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__action .n-button .n-base-icon svg.icon-switch-transition-enter-active, .n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__action .n-button .n-base-icon svg.icon-switch-transition-leave-active {
  transform-origin: center;
  position: absolute;
  left: 0;
  top: 0;
  transition: all .3s cubic-bezier(.4, 0, .2, 1) !important;
}

.n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__action.n-upload-file-info__action--image-type {

 position: relative;
 max-width: 80px;
 width: auto;
 
}

.n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__action.n-upload-file-info__action--image-card-type {

 z-index: 2;
 position: absolute;
 width: 100%;
 height: 100%;
 left: 0;
 right: 0;
 bottom: 0;
 top: 0;
 display: flex;
 justify-content: center;
 align-items: center;
 
}

.n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__name {

 color: var(--n-item-text-color);
 flex: 1;
 display: flex;
 justify-content: center;
 text-overflow: ellipsis;
 overflow: hidden;
 flex-direction: column;
 text-decoration-color: #0000;
 font-size: var(--n-font-size);
 transition:
 color .3s var(--n-bezier),
 text-decoration-color .3s var(--n-bezier); 
 
}

.n-upload-file-list .n-upload-file .n-upload-file-info .n-upload-file-info__name a {

 color: inherit;
 text-decoration: underline;
 
}

.n-upload-file-input {

 display: none;
 width: 0;
 height: 0;
 opacity: 0;
 
}</style><style cssr-id="n-modal">.n-modal-container {

 position: fixed;
 left: 0;
 top: 0;
 height: 0;
 width: 0;
 display: flex;
 
}

.n-modal-mask {

 position: fixed;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 background-color: rgba(0, 0, 0, .4);
 
}

.n-modal-mask.fade-in-transition-enter-active {
  transition: all .25s var(--n-bezier-ease-out)!important;
}

.n-modal-mask.fade-in-transition-leave-active {
  transition: all .25s var(--n-bezier-ease-out)!important;
}

.n-modal-mask.fade-in-transition-enter-from, .n-modal-mask.fade-in-transition-leave-to {
  opacity: 0;
}

.n-modal-mask.fade-in-transition-leave-from, .n-modal-mask.fade-in-transition-enter-to {
  opacity: 1;
}

.n-modal-body-wrapper {

 position: fixed;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 overflow: visible;
 
}

.n-modal-body-wrapper .n-modal-scroll-content {

 min-height: 100%;
 display: flex;
 position: relative;
 
}

.n-modal {

 position: relative;
 align-self: center;
 color: var(--n-text-color);
 margin: auto;
 box-shadow: var(--n-box-shadow);
 
}

.n-modal.fade-in-scale-up-transition-leave-active {
  transform-origin: inherit;
  transition: opacity .25s cubic-bezier(.4, 0, 1, 1), transform .25s cubic-bezier(.4, 0, 1, 1) ;
}

.n-modal.fade-in-scale-up-transition-enter-active {
  transform-origin: inherit;
  transition: opacity .25s cubic-bezier(0, 0, .2, 1), transform .25s cubic-bezier(0, 0, .2, 1) ;
}

.n-modal.fade-in-scale-up-transition-enter-from, .n-modal.fade-in-scale-up-transition-leave-to {
  opacity: 0;
  transform:  scale(.5);
}

.n-modal.fade-in-scale-up-transition-leave-from, .n-modal.fade-in-scale-up-transition-enter-to {
  opacity: 1;
  transform:  scale(1);
}

.n-modal .n-draggable {

 cursor: move;
 user-select: none;
 
}</style><style cssr-id="vueuc/binder">.v-binder-follower-container {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 0;
  pointer-events: none;
  z-index: auto;
}

.v-binder-follower-content {
  position: absolute;
  z-index: auto;
}

.v-binder-follower-content > * {
  pointer-events: all;
}</style><style cssr-id="n-popover">.n-popover {

 transition:
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 position: relative;
 font-size: var(--n-font-size);
 color: var(--n-text-color);
 box-shadow: var(--n-box-shadow);
 word-break: break-word;
 
}

.n-popover > .n-scrollbar {

 height: inherit;
 max-height: inherit;
 
}

.n-popover:not(.n-popover--raw) {

 background-color: var(--n-color);
 border-radius: var(--n-border-radius);
 
}

.n-popover:not(.n-popover--raw):not(.n-popover--scrollable):not(.n-popover--show-header-or-footer) {
padding: var(--n-padding);
}

.n-popover .n-popover__header {

 padding: var(--n-padding);
 border-bottom: 1px solid var(--n-divider-color);
 transition: border-color .3s var(--n-bezier);
 
}

.n-popover .n-popover__footer {

 padding: var(--n-padding);
 border-top: 1px solid var(--n-divider-color);
 transition: border-color .3s var(--n-bezier);
 
}

.n-popover.n-popover--scrollable .n-popover__content, .n-popover.n-popover--show-header-or-footer .n-popover__content {

 padding: var(--n-padding);
 
}

.n-popover-shared {

 transform-origin: inherit;
 
}

.n-popover-shared .n-popover-arrow-wrapper {

 position: absolute;
 overflow: hidden;
 pointer-events: none;
 
}

.n-popover-shared .n-popover-arrow-wrapper .n-popover-arrow {

 transition: background-color .3s var(--n-bezier);
 position: absolute;
 display: block;
 width: calc(var(--n-arrow-height) * 1.414);
 height: calc(var(--n-arrow-height) * 1.414);
 box-shadow: 0 0 8px 0 rgba(0, 0, 0, .12);
 transform: rotate(45deg);
 background-color: var(--n-color);
 pointer-events: all;
 
}

.n-popover-shared.popover-transition-enter-from, .n-popover-shared.popover-transition-leave-to {

 opacity: 0;
 transform: scale(.85);
 
}

.n-popover-shared.popover-transition-enter-to, .n-popover-shared.popover-transition-leave-from {

 transform: scale(1);
 opacity: 1;
 
}

.n-popover-shared.popover-transition-enter-active {

 transition:
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier),
 opacity .15s var(--n-bezier-ease-out),
 transform .15s var(--n-bezier-ease-out);
 
}

.n-popover-shared.popover-transition-leave-active {

 transition:
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier),
 opacity .15s var(--n-bezier-ease-in),
 transform .15s var(--n-bezier-ease-in);
 
}

[v-placement="top-start"] > .n-popover-shared {

 margin-bottom: var(--n-space);
 
}

[v-placement="top-start"] > .n-popover-shared.n-popover-shared--show-arrow {

 margin-bottom: var(--n-space-arrow);
 
}

[v-placement="top-start"] > .n-popover-shared.n-popover-shared--overlap {

 margin: 0;
 
}

[v-placement="top-start"] > .n-popover-shared > .n-popover-arrow-wrapper {

 right: 0;
 left: 0;
 top: 0;
 bottom: 0;
 top: 100%;
 bottom: auto;
 height: var(--n-space-arrow);
 
}

[v-placement="top-start"] > .n-popover-shared > .n-popover-arrow-wrapper .n-popover-arrow {

 top: calc(var(--n-arrow-height) * 1.414 / -2);
 left: calc(var(--n-arrow-offset) - var(--v-offset-left));
 
}

[v-placement="top"] > .n-popover-shared {

 margin-bottom: var(--n-space);
 
}

[v-placement="top"] > .n-popover-shared.n-popover-shared--show-arrow {

 margin-bottom: var(--n-space-arrow);
 
}

[v-placement="top"] > .n-popover-shared.n-popover-shared--overlap {

 margin: 0;
 
}

[v-placement="top"] > .n-popover-shared > .n-popover-arrow-wrapper {

 right: 0;
 left: 0;
 top: 0;
 bottom: 0;
 top: 100%;
 bottom: auto;
 height: var(--n-space-arrow);
 
}

[v-placement="top"] > .n-popover-shared > .n-popover-arrow-wrapper .n-popover-arrow {

 top: calc(var(--n-arrow-height) * 1.414 / -2);
 transform: translateX(calc(var(--n-arrow-height) * 1.414 / -2)) rotate(45deg);
 left: 50%;
 
}

[v-placement="top-end"] > .n-popover-shared {

 margin-bottom: var(--n-space);
 
}

[v-placement="top-end"] > .n-popover-shared.n-popover-shared--show-arrow {

 margin-bottom: var(--n-space-arrow);
 
}

[v-placement="top-end"] > .n-popover-shared.n-popover-shared--overlap {

 margin: 0;
 
}

[v-placement="top-end"] > .n-popover-shared > .n-popover-arrow-wrapper {

 right: 0;
 left: 0;
 top: 0;
 bottom: 0;
 top: 100%;
 bottom: auto;
 height: var(--n-space-arrow);
 
}

[v-placement="top-end"] > .n-popover-shared > .n-popover-arrow-wrapper .n-popover-arrow {

 top: calc(var(--n-arrow-height) * 1.414 / -2);
 right: calc(var(--n-arrow-offset) + var(--v-offset-left));
 
}

[v-placement="bottom-start"] > .n-popover-shared {

 margin-top: var(--n-space);
 
}

[v-placement="bottom-start"] > .n-popover-shared.n-popover-shared--show-arrow {

 margin-top: var(--n-space-arrow);
 
}

[v-placement="bottom-start"] > .n-popover-shared.n-popover-shared--overlap {

 margin: 0;
 
}

[v-placement="bottom-start"] > .n-popover-shared > .n-popover-arrow-wrapper {

 right: 0;
 left: 0;
 top: 0;
 bottom: 0;
 bottom: 100%;
 top: auto;
 height: var(--n-space-arrow);
 
}

[v-placement="bottom-start"] > .n-popover-shared > .n-popover-arrow-wrapper .n-popover-arrow {

 bottom: calc(var(--n-arrow-height) * 1.414 / -2);
 left: calc(var(--n-arrow-offset) - var(--v-offset-left));
 
}

[v-placement="bottom"] > .n-popover-shared {

 margin-top: var(--n-space);
 
}

[v-placement="bottom"] > .n-popover-shared.n-popover-shared--show-arrow {

 margin-top: var(--n-space-arrow);
 
}

[v-placement="bottom"] > .n-popover-shared.n-popover-shared--overlap {

 margin: 0;
 
}

[v-placement="bottom"] > .n-popover-shared > .n-popover-arrow-wrapper {

 right: 0;
 left: 0;
 top: 0;
 bottom: 0;
 bottom: 100%;
 top: auto;
 height: var(--n-space-arrow);
 
}

[v-placement="bottom"] > .n-popover-shared > .n-popover-arrow-wrapper .n-popover-arrow {

 bottom: calc(var(--n-arrow-height) * 1.414 / -2);
 transform: translateX(calc(var(--n-arrow-height) * 1.414 / -2)) rotate(45deg);
 left: 50%;
 
}

[v-placement="bottom-end"] > .n-popover-shared {

 margin-top: var(--n-space);
 
}

[v-placement="bottom-end"] > .n-popover-shared.n-popover-shared--show-arrow {

 margin-top: var(--n-space-arrow);
 
}

[v-placement="bottom-end"] > .n-popover-shared.n-popover-shared--overlap {

 margin: 0;
 
}

[v-placement="bottom-end"] > .n-popover-shared > .n-popover-arrow-wrapper {

 right: 0;
 left: 0;
 top: 0;
 bottom: 0;
 bottom: 100%;
 top: auto;
 height: var(--n-space-arrow);
 
}

[v-placement="bottom-end"] > .n-popover-shared > .n-popover-arrow-wrapper .n-popover-arrow {

 bottom: calc(var(--n-arrow-height) * 1.414 / -2);
 right: calc(var(--n-arrow-offset) + var(--v-offset-left));
 
}

[v-placement="left-start"] > .n-popover-shared {

 margin-right: var(--n-space);
 
}

[v-placement="left-start"] > .n-popover-shared.n-popover-shared--show-arrow {

 margin-right: var(--n-space-arrow);
 
}

[v-placement="left-start"] > .n-popover-shared.n-popover-shared--overlap {

 margin: 0;
 
}

[v-placement="left-start"] > .n-popover-shared > .n-popover-arrow-wrapper {

 right: 0;
 left: 0;
 top: 0;
 bottom: 0;
 left: 100%;
 right: auto;
 width: var(--n-space-arrow);
 
}

[v-placement="left-start"] > .n-popover-shared > .n-popover-arrow-wrapper .n-popover-arrow {

 left: calc(var(--n-arrow-height) * 1.414 / -2);
 top: calc(var(--n-arrow-offset-vertical) - var(--v-offset-top));
 
}

[v-placement="left"] > .n-popover-shared {

 margin-right: var(--n-space);
 
}

[v-placement="left"] > .n-popover-shared.n-popover-shared--show-arrow {

 margin-right: var(--n-space-arrow);
 
}

[v-placement="left"] > .n-popover-shared.n-popover-shared--overlap {

 margin: 0;
 
}

[v-placement="left"] > .n-popover-shared > .n-popover-arrow-wrapper {

 right: 0;
 left: 0;
 top: 0;
 bottom: 0;
 left: 100%;
 right: auto;
 width: var(--n-space-arrow);
 
}

[v-placement="left"] > .n-popover-shared > .n-popover-arrow-wrapper .n-popover-arrow {

 left: calc(var(--n-arrow-height) * 1.414 / -2);
 transform: translateY(calc(var(--n-arrow-height) * 1.414 / -2)) rotate(45deg);
 top: 50%;
 
}

[v-placement="left-end"] > .n-popover-shared {

 margin-right: var(--n-space);
 
}

[v-placement="left-end"] > .n-popover-shared.n-popover-shared--show-arrow {

 margin-right: var(--n-space-arrow);
 
}

[v-placement="left-end"] > .n-popover-shared.n-popover-shared--overlap {

 margin: 0;
 
}

[v-placement="left-end"] > .n-popover-shared > .n-popover-arrow-wrapper {

 right: 0;
 left: 0;
 top: 0;
 bottom: 0;
 left: 100%;
 right: auto;
 width: var(--n-space-arrow);
 
}

[v-placement="left-end"] > .n-popover-shared > .n-popover-arrow-wrapper .n-popover-arrow {

 left: calc(var(--n-arrow-height) * 1.414 / -2);
 bottom: calc(var(--n-arrow-offset-vertical) + var(--v-offset-top));
 
}

[v-placement="right-start"] > .n-popover-shared {

 margin-left: var(--n-space);
 
}

[v-placement="right-start"] > .n-popover-shared.n-popover-shared--show-arrow {

 margin-left: var(--n-space-arrow);
 
}

[v-placement="right-start"] > .n-popover-shared.n-popover-shared--overlap {

 margin: 0;
 
}

[v-placement="right-start"] > .n-popover-shared > .n-popover-arrow-wrapper {

 right: 0;
 left: 0;
 top: 0;
 bottom: 0;
 right: 100%;
 left: auto;
 width: var(--n-space-arrow);
 
}

[v-placement="right-start"] > .n-popover-shared > .n-popover-arrow-wrapper .n-popover-arrow {

 right: calc(var(--n-arrow-height) * 1.414 / -2);
 top: calc(var(--n-arrow-offset-vertical) - var(--v-offset-top));
 
}

[v-placement="right"] > .n-popover-shared {

 margin-left: var(--n-space);
 
}

[v-placement="right"] > .n-popover-shared.n-popover-shared--show-arrow {

 margin-left: var(--n-space-arrow);
 
}

[v-placement="right"] > .n-popover-shared.n-popover-shared--overlap {

 margin: 0;
 
}

[v-placement="right"] > .n-popover-shared > .n-popover-arrow-wrapper {

 right: 0;
 left: 0;
 top: 0;
 bottom: 0;
 right: 100%;
 left: auto;
 width: var(--n-space-arrow);
 
}

[v-placement="right"] > .n-popover-shared > .n-popover-arrow-wrapper .n-popover-arrow {

 right: calc(var(--n-arrow-height) * 1.414 / -2);
 transform: translateY(calc(var(--n-arrow-height) * 1.414 / -2)) rotate(45deg);
 top: 50%;
 
}

[v-placement="right-end"] > .n-popover-shared {

 margin-left: var(--n-space);
 
}

[v-placement="right-end"] > .n-popover-shared.n-popover-shared--show-arrow {

 margin-left: var(--n-space-arrow);
 
}

[v-placement="right-end"] > .n-popover-shared.n-popover-shared--overlap {

 margin: 0;
 
}

[v-placement="right-end"] > .n-popover-shared > .n-popover-arrow-wrapper {

 right: 0;
 left: 0;
 top: 0;
 bottom: 0;
 right: 100%;
 left: auto;
 width: var(--n-space-arrow);
 
}

[v-placement="right-end"] > .n-popover-shared > .n-popover-arrow-wrapper .n-popover-arrow {

 right: calc(var(--n-arrow-height) * 1.414 / -2);
 bottom: calc(var(--n-arrow-offset-vertical) + var(--v-offset-top));
 
}

[v-placement="right-start"] > .n-popover-shared.n-popover-shared--center-arrow .n-popover-arrow {
top: calc(max(calc((var(--v-target-height, 0px) - var(--n-arrow-height) * 1.414) / 2), var(--n-arrow-offset-vertical)) - var(--v-offset-top));
}

[v-placement="left-start"] > .n-popover-shared.n-popover-shared--center-arrow .n-popover-arrow {
top: calc(max(calc((var(--v-target-height, 0px) - var(--n-arrow-height) * 1.414) / 2), var(--n-arrow-offset-vertical)) - var(--v-offset-top));
}

[v-placement="top-end"] > .n-popover-shared.n-popover-shared--center-arrow .n-popover-arrow {
right: calc(max(calc((var(--v-target-width, 0px) - var(--n-arrow-height) * 1.414) / 2), var(--n-arrow-offset)) + var(--v-offset-left));
}

[v-placement="bottom-end"] > .n-popover-shared.n-popover-shared--center-arrow .n-popover-arrow {
right: calc(max(calc((var(--v-target-width, 0px) - var(--n-arrow-height) * 1.414) / 2), var(--n-arrow-offset)) + var(--v-offset-left));
}

[v-placement="right-end"] > .n-popover-shared.n-popover-shared--center-arrow .n-popover-arrow {
bottom: calc(max(calc((var(--v-target-height, 0px) - var(--n-arrow-height) * 1.414) / 2), var(--n-arrow-offset-vertical)) + var(--v-offset-top));
}

[v-placement="left-end"] > .n-popover-shared.n-popover-shared--center-arrow .n-popover-arrow {
bottom: calc(max(calc((var(--v-target-height, 0px) - var(--n-arrow-height) * 1.414) / 2), var(--n-arrow-offset-vertical)) + var(--v-offset-top));
}

[v-placement="top-start"] > .n-popover-shared.n-popover-shared--center-arrow .n-popover-arrow {
left: calc(max(calc((var(--v-target-width, 0px) - var(--n-arrow-height) * 1.414) / 2), var(--n-arrow-offset)) - var(--v-offset-left));
}

[v-placement="bottom-start"] > .n-popover-shared.n-popover-shared--center-arrow .n-popover-arrow {
left: calc(max(calc((var(--v-target-width, 0px) - var(--n-arrow-height) * 1.414) / 2), var(--n-arrow-offset)) - var(--v-offset-left));
}</style><style cssr-id="n-notification">.n-notification-container {

 z-index: 4000;
 position: fixed;
 overflow: visible;
 display: flex;
 flex-direction: column;
 align-items: flex-end;
 
}

.n-notification-container > .n-scrollbar {

 width: initial;
 overflow: visible;
 height: -moz-fit-content !important;
 height: fit-content !important;
 max-height: 100vh !important;
 
}

.n-notification-container > .n-scrollbar > .n-scrollbar-container {

 height: -moz-fit-content !important;
 height: fit-content !important;
 max-height: 100vh !important;
 
}

.n-notification-container > .n-scrollbar > .n-scrollbar-container .n-scrollbar-content {

 padding-top: 12px;
 padding-bottom: 33px;
 
}

.n-notification-container.n-notification-container--top, .n-notification-container.n-notification-container--top-right, .n-notification-container.n-notification-container--top-left {

 top: 12px;
 
}

.n-notification-container.n-notification-container--top.transitioning > .n-scrollbar > .n-scrollbar-container, .n-notification-container.n-notification-container--top-right.transitioning > .n-scrollbar > .n-scrollbar-container, .n-notification-container.n-notification-container--top-left.transitioning > .n-scrollbar > .n-scrollbar-container {

 min-height: 100vh !important;
 
}

.n-notification-container.n-notification-container--bottom, .n-notification-container.n-notification-container--bottom-right, .n-notification-container.n-notification-container--bottom-left {

 bottom: 12px;
 
}

.n-notification-container.n-notification-container--bottom > .n-scrollbar > .n-scrollbar-container .n-scrollbar-content, .n-notification-container.n-notification-container--bottom-right > .n-scrollbar > .n-scrollbar-container .n-scrollbar-content, .n-notification-container.n-notification-container--bottom-left > .n-scrollbar > .n-scrollbar-container .n-scrollbar-content {

 padding-bottom: 12px;
 
}

.n-notification-container.n-notification-container--bottom .n-notification-wrapper, .n-notification-container.n-notification-container--bottom-right .n-notification-wrapper, .n-notification-container.n-notification-container--bottom-left .n-notification-wrapper {

 display: flex;
 align-items: flex-end;
 margin-bottom: 0;
 margin-top: 12px;
 
}

.n-notification-container.n-notification-container--top, .n-notification-container.n-notification-container--bottom {

 left: 50%;
 transform: translateX(-50%);
 
}

.n-notification-container.n-notification-container--top .n-notification-wrapper.notification-transition-enter-from, .n-notification-container.n-notification-container--bottom .n-notification-wrapper.notification-transition-enter-from, .n-notification-container.n-notification-container--top .n-notification-wrapper.notification-transition-leave-to, .n-notification-container.n-notification-container--bottom .n-notification-wrapper.notification-transition-leave-to {

 transform: scale(0.85);
 
}

.n-notification-container.n-notification-container--top .n-notification-wrapper.notification-transition-leave-from, .n-notification-container.n-notification-container--bottom .n-notification-wrapper.notification-transition-leave-from, .n-notification-container.n-notification-container--top .n-notification-wrapper.notification-transition-enter-to, .n-notification-container.n-notification-container--bottom .n-notification-wrapper.notification-transition-enter-to {

 transform: scale(1);
 
}

.n-notification-container.n-notification-container--top .n-notification-wrapper {

 transform-origin: top center;
 
}

.n-notification-container.n-notification-container--bottom .n-notification-wrapper {

 transform-origin: bottom center;
 
}

.n-notification-container.n-notification-container--top-right .n-notification, .n-notification-container.n-notification-container--bottom-right .n-notification {

 margin-left: 28px;
 margin-right: 16px;
 
}

.n-notification-container.n-notification-container--top-left .n-notification, .n-notification-container.n-notification-container--bottom-left .n-notification {

 margin-left: 16px;
 margin-right: 28px;
 
}

.n-notification-container.n-notification-container--top-right {

 right: 0;
 
}

.n-notification-container.n-notification-container--top-right .n-notification-wrapper.notification-transition-enter-from, .n-notification-container.n-notification-container--top-right .n-notification-wrapper.notification-transition-leave-to {

 transform: translate(calc(100%), 0);
 
}

.n-notification-container.n-notification-container--top-right .n-notification-wrapper.notification-transition-leave-from, .n-notification-container.n-notification-container--top-right .n-notification-wrapper.notification-transition-enter-to {

 transform: translate(0, 0);
 
}

.n-notification-container.n-notification-container--top-left {

 left: 0;
 
}

.n-notification-container.n-notification-container--top-left .n-notification-wrapper.notification-transition-enter-from, .n-notification-container.n-notification-container--top-left .n-notification-wrapper.notification-transition-leave-to {

 transform: translate(calc(-100%), 0);
 
}

.n-notification-container.n-notification-container--top-left .n-notification-wrapper.notification-transition-leave-from, .n-notification-container.n-notification-container--top-left .n-notification-wrapper.notification-transition-enter-to {

 transform: translate(0, 0);
 
}

.n-notification-container.n-notification-container--bottom-right {

 right: 0;
 
}

.n-notification-container.n-notification-container--bottom-right .n-notification-wrapper.notification-transition-enter-from, .n-notification-container.n-notification-container--bottom-right .n-notification-wrapper.notification-transition-leave-to {

 transform: translate(calc(100%), 0);
 
}

.n-notification-container.n-notification-container--bottom-right .n-notification-wrapper.notification-transition-leave-from, .n-notification-container.n-notification-container--bottom-right .n-notification-wrapper.notification-transition-enter-to {

 transform: translate(0, 0);
 
}

.n-notification-container.n-notification-container--bottom-left {

 left: 0;
 
}

.n-notification-container.n-notification-container--bottom-left .n-notification-wrapper.notification-transition-enter-from, .n-notification-container.n-notification-container--bottom-left .n-notification-wrapper.notification-transition-leave-to {

 transform: translate(calc(-100%), 0);
 
}

.n-notification-container.n-notification-container--bottom-left .n-notification-wrapper.notification-transition-leave-from, .n-notification-container.n-notification-container--bottom-left .n-notification-wrapper.notification-transition-enter-to {

 transform: translate(0, 0);
 
}

.n-notification-container.n-notification-container--scrollable.n-notification-container--top-right {

 top: 0;
 
}

.n-notification-container.n-notification-container--scrollable.n-notification-container--top-left {

 top: 0;
 
}

.n-notification-container.n-notification-container--scrollable.n-notification-container--bottom-right {

 bottom: 0;
 
}

.n-notification-container.n-notification-container--scrollable.n-notification-container--bottom-left {

 bottom: 0;
 
}

.n-notification-container .n-notification-wrapper {

 margin-bottom: 12px;
 
}

.n-notification-container .n-notification-wrapper.notification-transition-enter-from, .n-notification-container .n-notification-wrapper.notification-transition-leave-to {

 opacity: 0;
 margin-top: 0 !important;
 margin-bottom: 0 !important;
 
}

.n-notification-container .n-notification-wrapper.notification-transition-leave-from, .n-notification-container .n-notification-wrapper.notification-transition-enter-to {

 opacity: 1;
 
}

.n-notification-container .n-notification-wrapper.notification-transition-leave-active {

 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier),
 opacity .3s var(--n-bezier),
 transform .3s var(--n-bezier-ease-in),
 max-height .3s var(--n-bezier),
 margin-top .3s linear,
 margin-bottom .3s linear,
 box-shadow .3s var(--n-bezier);
 
}

.n-notification-container .n-notification-wrapper.notification-transition-enter-active {

 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier),
 opacity .3s var(--n-bezier),
 transform .3s var(--n-bezier-ease-out),
 max-height .3s var(--n-bezier),
 margin-top .3s linear,
 margin-bottom .3s linear,
 box-shadow .3s var(--n-bezier);
 
}

.n-notification-container .n-notification {

 background-color: var(--n-color);
 color: var(--n-text-color);
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier),
 opacity .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier);
 font-family: inherit;
 font-size: var(--n-font-size);
 font-weight: 400;
 position: relative;
 display: flex;
 overflow: hidden;
 flex-shrink: 0;
 padding-left: var(--n-padding-left);
 padding-right: var(--n-padding-right);
 width: var(--n-width);
 max-width: calc(100vw - 16px - 16px);
 border-radius: var(--n-border-radius);
 box-shadow: var(--n-box-shadow);
 box-sizing: border-box;
 opacity: 1;
 
}

.n-notification-container .n-notification .n-notification__avatar .n-icon {

 color: var(--n-icon-color);
 
}

.n-notification-container .n-notification .n-notification__avatar .n-base-icon {

 color: var(--n-icon-color);
 
}

.n-notification-container .n-notification.n-notification--show-avatar .n-notification-main {

 margin-left: 40px;
 width: calc(100% - 40px); 
 
}

.n-notification-container .n-notification.n-notification--closable .n-notification-main > *:first-child {

 padding-right: 20px;
 
}

.n-notification-container .n-notification.n-notification--closable .n-notification__close {

 position: absolute;
 top: 0;
 right: 0;
 margin: var(--n-close-margin);
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 
}

.n-notification-container .n-notification .n-notification__avatar {

 position: absolute;
 top: var(--n-padding-top);
 left: var(--n-padding-left);
 width: 28px;
 height: 28px;
 font-size: 28px;
 display: flex;
 align-items: center;
 justify-content: center;
 
}

.n-notification-container .n-notification .n-notification__avatar .n-icon {
transition: color .3s var(--n-bezier);
}

.n-notification-container .n-notification .n-notification-main {

 padding-top: var(--n-padding-top);
 padding-bottom: var(--n-padding-bottom);
 box-sizing: border-box;
 display: flex;
 flex-direction: column;
 margin-left: 8px;
 width: calc(100% - 8px);
 
}

.n-notification-container .n-notification .n-notification-main .n-notification-main-footer {

 display: flex;
 align-items: center;
 justify-content: space-between;
 margin-top: 12px;
 
}

.n-notification-container .n-notification .n-notification-main .n-notification-main-footer .n-notification-main-footer__meta {

 font-size: var(--n-meta-font-size);
 transition: color .3s var(--n-bezier-ease-out);
 color: var(--n-description-text-color);
 
}

.n-notification-container .n-notification .n-notification-main .n-notification-main-footer .n-notification-main-footer__action {

 cursor: pointer;
 transition: color .3s var(--n-bezier-ease-out);
 color: var(--n-action-text-color);
 
}

.n-notification-container .n-notification .n-notification-main .n-notification-main__header {

 font-weight: var(--n-title-font-weight);
 font-size: var(--n-title-font-size);
 transition: color .3s var(--n-bezier-ease-out);
 color: var(--n-title-text-color);
 
}

.n-notification-container .n-notification .n-notification-main .n-notification-main__description {

 margin-top: 8px;
 font-size: var(--n-description-font-size);
 white-space: pre-wrap;
 word-wrap: break-word;
 transition: color .3s var(--n-bezier-ease-out);
 color: var(--n-description-text-color);
 
}

.n-notification-container .n-notification .n-notification-main .n-notification-main__content {

 line-height: var(--n-line-height);
 margin: 12px 0 0 0;
 font-family: inherit;
 white-space: pre-wrap;
 word-wrap: break-word;
 transition: color .3s var(--n-bezier-ease-out);
 color: var(--n-text-color);
 
}

.n-notification-container .n-notification .n-notification-main .n-notification-main__content:first-child {
margin: 0;
}</style><style cssr-id="n-global">body {

 margin: 0;
 font-size: 14px;
 font-family: v-sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
 line-height: 1.6;
 -webkit-text-size-adjust: 100%;
 -webkit-tap-highlight-color: transparent;

}

body input {

 font-family: inherit;
 font-size: inherit;
 
}</style><style cssr-id="n-loading-bar">.n-loading-bar-container {

 z-index: 5999;
 position: fixed;
 top: 0;
 left: 0;
 right: 0;
 height: 2px;

}

.n-loading-bar-container.fade-in-transition-enter-active {
  transition: all 0.3s cubic-bezier(.4, 0, .2, 1)!important;
}

.n-loading-bar-container.fade-in-transition-leave-active {
  transition: all 0.8s cubic-bezier(.4, 0, .2, 1)!important;
}

.n-loading-bar-container.fade-in-transition-enter-from, .n-loading-bar-container.fade-in-transition-leave-to {
  opacity: 0;
}

.n-loading-bar-container.fade-in-transition-leave-from, .n-loading-bar-container.fade-in-transition-enter-to {
  opacity: 1;
}

.n-loading-bar-container .n-loading-bar {

 width: 100%;
 transition:
 max-width 4s linear,
 background .2s linear;
 height: var(--n-height);
 
}

.n-loading-bar-container .n-loading-bar.n-loading-bar--starting {

 background: var(--n-color-loading);
 
}

.n-loading-bar-container .n-loading-bar.n-loading-bar--finishing {

 background: var(--n-color-loading);
 transition:
 max-width .2s linear,
 background .2s linear;
 
}

.n-loading-bar-container .n-loading-bar.n-loading-bar--error {

 background: var(--n-color-error);
 transition:
 max-width .2s linear,
 background .2s linear;
 
}</style><style class="vjs-styles-defaults">
      .video-js {
        width: 300px;
        height: 150px;
      }

      .vjs-fluid:not(.vjs-audio-only-mode) {
        padding-top: 56.25%
      }
    </style>
    <meta charset="UTF-8">
    <link rel="icon" type="image/svg+xml" href="/assets/logo-DQm_MB9r.png">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 火宝</title>
    <script type="module" crossorigin="" src="/assets/index-DKIDWWYz.js"></script>
    <link rel="stylesheet" crossorigin="" href="/assets/index-Cl4iyH-b.css">
  <link rel="modulepreload" as="script" crossorigin="" href="/assets/index-DzD3_FJE.js"><link rel="modulepreload" as="script" crossorigin="" href="/assets/loading-B7HO8dm-.js"><link rel="modulepreload" as="script" crossorigin="" href="/assets/index-BjQsIs_i.js"><link rel="stylesheet" crossorigin="" href="/assets/index-Cx_vehFp.css"><link rel="stylesheet" crossorigin="" href="/assets/index-CJtI8pi3.css"></head>
  <body>
    <div id="app" data-v-app=""><div data-v-755615db="" class="n-config-provider app-container dark-mode"><div data-v-09e383b3="" data-v-755615db="" class="layout-wrapper"><!----><!----><div data-v-09e383b3="" class="floating-sidebar"><div data-v-81fdcb80="" class="sidebar-container"><div data-v-81fdcb80="" class="logo-section flex justify-between items-center overflow-hidden p-3 h-[60px] cursor-pointer"><div data-v-81fdcb80="" class="flex items-center shrink-0"><img data-v-81fdcb80="" src="/assets/logo-DQm_MB9r.png" alt="Logo" class="w-10 h-8 shrink-0 transition-all duration-300"><p data-v-81fdcb80="" class="text-lg font-bold whitespace-nowrap transition-all duration-300 opacity-100 max-w-[80px] ml-2">AI 火宝</p></div><div data-v-81fdcb80="" class="flex items-center transition-all duration-300"><svg data-v-104cf9eb="" data-v-81fdcb80="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--tabler" width="25" height="25" viewBox="0 0 24 24"><path fill="currentColor" d="M18 3a3 3 0 0 1 2.995 2.824L21 6v12a3 3 0 0 1-2.824 2.995L18 21H6a3 3 0 0 1-2.995-2.824L3 18V6a3 3 0 0 1 2.824-2.995L6 3zm-3 2H6a1 1 0 0 0-.993.883L5 6v12a1 1 0 0 0 .883.993L6 19h9zm-3.293 4.293a1 1 0 0 1 .083 1.32l-.083.094L10.415 12l1.292 1.293a1 1 0 0 1 .083 1.32l-.083.094a1 1 0 0 1-1.32.083l-.094-.083l-2-2a1 1 0 0 1-.083-1.32l.083-.094l2-2a1 1 0 0 1 1.414 0"></path></svg></div></div><div data-v-81fdcb80="" class="menu-sections flex-1 overflow-y-auto"><p data-v-81fdcb80="" class="menu-category text-xs font-medium px-4 pt-2 pb-2">问答</p><div data-v-81fdcb80="" class="menu-item h-[40px] flex items-center px-4 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200"><div data-v-81fdcb80="" class="flex items-center w-full"><svg data-v-104cf9eb="" data-v-81fdcb80="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon shrink-0 shrink-0 iconify iconify--ic" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v12H5.17L4 17.17zm0-2c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm2 10h8v2H6zm0-3h12v2H6zm0-3h12v2H6z"></path></svg><p data-v-81fdcb80="" class="transition-all duration-300 whitespace-nowrap overflow-hidden opacity-100 max-w-[120px] ml-3">问答</p></div><!----></div><p data-v-81fdcb80="" class="menu-category text-xs font-medium px-4 pt-2 pb-2">AI 创作</p><div data-v-81fdcb80="" class="menu-item h-[40px] flex items-center px-4 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200 active"><div data-v-81fdcb80="" class="flex items-center w-full"><svg data-v-104cf9eb="" data-v-81fdcb80="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon shrink-0 shrink-0 iconify iconify--material-symbols" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M4 19v-9q0-.475.213-.9t.587-.7l6-4.5q.525-.4 1.2-.4t1.2.4l6 4.5q.375.275.588.7T20 10v9q0 .825-.588 1.413T18 21h-3q-.425 0-.712-.288T14 20v-5q0-.425-.288-.712T13 14h-2q-.425 0-.712.288T10 15v5q0 .425-.288.713T9 21H6q-.825 0-1.412-.587T4 19"></path></svg><p data-v-81fdcb80="" class="transition-all duration-300 whitespace-nowrap overflow-hidden opacity-100 max-w-[120px] ml-3">灵感</p></div><!----></div><div data-v-81fdcb80="" class="menu-item h-[40px] flex items-center px-4 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200"><div data-v-81fdcb80="" class="flex items-center w-full"><svg data-v-104cf9eb="" data-v-81fdcb80="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon shrink-0 shrink-0 iconify iconify--hugeicons" width="20" height="20" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"><path stroke-linecap="round" d="M19 9.62c0 2.58-1.27 4.565-3.202 5.872c-.45.304-.675.456-.786.63c-.11.172-.149.4-.224.854l-.06.353c-.132.798-.199 1.197-.479 1.434s-.684.237-1.493.237h-2.612c-.809 0-1.213 0-1.493-.237s-.346-.636-.48-1.434l-.058-.353c-.076-.453-.113-.68-.223-.852s-.336-.326-.787-.634C5.192 14.183 4 12.199 4 9.62C4 5.413 7.358 2 11.5 2a7.4 7.4 0 0 1 1.5.152"></path><path d="m16.5 2l.258.697c.338.914.507 1.371.84 1.704c.334.334.791.503 1.705.841L20 5.5l-.697.258c-.914.338-1.371.507-1.704.84c-.334.334-.503.791-.841 1.705L16.5 9l-.258-.697c-.338-.914-.507-1.371-.84-1.704c-.334-.334-.791-.503-1.705-.841L13 5.5l.697-.258c.914-.338 1.371-.507 1.704-.84c.334-.334.503-.791.841-1.705zm-3 17v1c0 .943 0 1.414-.293 1.707S12.443 22 11.5 22s-1.414 0-1.707-.293S9.5 20.943 9.5 20v-1"></path></g></svg><p data-v-81fdcb80="" class="transition-all duration-300 whitespace-nowrap overflow-hidden opacity-100 max-w-[120px] ml-3">创作</p></div><!----></div><div data-v-81fdcb80="" class="menu-item h-[40px] flex items-center px-4 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200"><div data-v-81fdcb80="" class="flex items-center w-full"><svg data-v-104cf9eb="" data-v-81fdcb80="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon shrink-0 shrink-0 iconify iconify--hugeicons" width="20" height="20" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linejoin="round" d="M4 8c0-2.828 0-4.243 1.004-5.121S7.624 2 10.857 2h2.286c3.232 0 4.849 0 5.853.879C20 3.757 20 5.172 20 8v9H4z"></path><path stroke-linecap="round" d="M3 17h18"></path><path stroke-linecap="round" stroke-linejoin="round" d="M10.699 5.566c1.23-.176 3.268-.106 1.581 1.587c-2.108 2.115-5.272 6.876-1.581 5.29c3.69-1.588 5.272-.53 3.69 1.057"></path><path stroke-linecap="round" d="M12 17v4m-7 1l3-5m11 5l-3-5"></path></g></svg><p data-v-81fdcb80="" class="transition-all duration-300 whitespace-nowrap overflow-hidden opacity-100 max-w-[120px] ml-3">画布</p></div><!----></div><div data-v-81fdcb80="" class="menu-item h-[40px] flex items-center px-4 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200"><div data-v-81fdcb80="" class="flex items-center w-full"><svg data-v-104cf9eb="" data-v-81fdcb80="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon shrink-0 shrink-0 iconify iconify--solar" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M6.86 1.25h.127c.351 0 .577 0 .798.02a4.75 4.75 0 0 1 2.59 1.073c.17.142.33.302.579.55l.576.577c.846.845 1.171 1.161 1.547 1.37q.328.182.689.286c.413.117.866.124 2.062.124h.425c1.273 0 2.3 0 3.111.102c.841.106 1.556.332 2.144.86q.147.133.28.28c.529.588.754 1.303.86 2.144c.08.638.097 1.407.101 2.325v.072l.001.714v2.31c0 1.837 0 3.293-.153 4.432c-.158 1.172-.49 2.121-1.238 2.87c-.749.748-1.698 1.08-2.87 1.238c-1.14.153-2.595.153-4.433.153H9.944c-1.838 0-3.294 0-4.433-.153c-1.172-.158-2.121-.49-2.87-1.238c-.748-.749-1.08-1.698-1.238-2.87c-.153-1.14-.153-2.595-.153-4.433V6.86c0-.797 0-1.303.082-1.74A4.75 4.75 0 0 1 5.12 1.331c.438-.082.944-.082 1.74-.082m-4.11 10.5V14c0 1.907.002 3.262.14 4.29c.135 1.005.389 1.585.812 2.008s1.003.677 2.009.812c1.028.138 2.382.14 4.289.14h4c1.907 0 3.262-.002 4.29-.14c1.005-.135 1.585-.389 2.008-.812s.677-1.003.812-2.009c.138-1.027.14-2.382.14-4.289v-2.25zm18.492-1.5H2.75v-3.3c0-.917.003-1.271.056-1.553a3.25 3.25 0 0 1 2.591-2.59c.282-.054.636-.057 1.553-.057c.4 0 .553 0 .696.014a3.25 3.25 0 0 1 1.771.734a8 8 0 0 1 .502.482l.55.55l.079.078c.74.742 1.218 1.22 1.8 1.543q.479.266 1.007.417c.64.182 1.315.182 2.363.182h.484c1.336 0 2.267.001 2.975.09c.689.087 1.06.246 1.328.487q.088.08.168.168c.241.269.4.64.487 1.328c.05.395.072.86.082 1.427" clip-rule="evenodd"></path></svg><p data-v-81fdcb80="" class="transition-all duration-300 whitespace-nowrap overflow-hidden opacity-100 max-w-[120px] ml-3">资产</p></div><!----></div><p data-v-81fdcb80="" class="menu-category text-xs font-medium px-4 pt-2 pb-2">账户管理</p><div data-v-81fdcb80="" class="menu-item h-[40px] flex items-center px-4 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200"><div data-v-81fdcb80="" class="flex items-center w-full"><svg data-v-104cf9eb="" data-v-81fdcb80="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon shrink-0 shrink-0 iconify iconify--ic" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2M7.35 18.5C8.66 17.56 10.26 17 12 17s3.34.56 4.65 1.5c-1.31.94-2.91 1.5-4.65 1.5s-3.34-.56-4.65-1.5m10.79-1.38a9.95 9.95 0 0 0-12.28 0A7.96 7.96 0 0 1 4 12c0-4.42 3.58-8 8-8s8 3.58 8 8c0 1.95-.7 3.73-1.86 5.12"></path><path fill="currentColor" d="M12 6c-1.93 0-3.5 1.57-3.5 3.5S10.07 13 12 13s3.5-1.57 3.5-3.5S13.93 6 12 6m0 5c-.83 0-1.5-.67-1.5-1.5S11.17 8 12 8s1.5.67 1.5 1.5S12.83 11 12 11"></path></svg><p data-v-81fdcb80="" class="transition-all duration-300 whitespace-nowrap overflow-hidden opacity-100 max-w-[120px] ml-3">套餐</p></div><!----></div><div data-v-81fdcb80="" class="menu-item h-[40px] flex items-center px-4 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200"><div data-v-81fdcb80="" class="flex items-center w-full"><svg data-v-104cf9eb="" data-v-81fdcb80="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon shrink-0 shrink-0 iconify iconify--mingcute" width="20" height="20" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"></path><path fill="currentColor" d="M4 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v16a1 1 0 0 1-1.625.78l-1.875-1.5l-1.875 1.5a1 1 0 0 1-1.332-.073L12 20.414l-1.293 1.293a1 1 0 0 1-1.332.074L7.5 20.28l-1.875 1.5A1 1 0 0 1 4 21zm3-1a1 1 0 0 0-1 1v13.92l.875-.7a1 1 0 0 1 1.25 0l1.8 1.44l1.368-1.367a1 1 0 0 1 1.414 0l1.367 1.367l1.801-1.44a1 1 0 0 1 1.25 0l.875.7V5a1 1 0 0 0-1-1zm1 5a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1m1 3a1 1 0 1 0 0 2h3a1 1 0 1 0 0-2z"></path></g></svg><p data-v-81fdcb80="" class="transition-all duration-300 whitespace-nowrap overflow-hidden opacity-100 max-w-[120px] ml-3">交易记录</p></div><!----></div><div data-v-81fdcb80="" class="menu-item h-[40px] flex items-center px-4 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200"><div data-v-81fdcb80="" class="flex items-center w-full"><svg data-v-104cf9eb="" data-v-81fdcb80="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon shrink-0 shrink-0 iconify iconify--mdi" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M22 12v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a1 1 0 0 1-1-1V8a2 2 0 0 1 2-2h3.17A3 3 0 0 1 6 5a3 3 0 0 1 3-3c1 0 1.88.5 2.43 1.24v-.01L12 4l.57-.77v.01C13.12 2.5 14 2 15 2a3 3 0 0 1 3 3a3 3 0 0 1-.17 1H21a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1M4 20h7v-8H4zm16 0v-8h-7v8zM9 4a1 1 0 0 0-1 1a1 1 0 0 0 1 1a1 1 0 0 0 1-1a1 1 0 0 0-1-1m6 0a1 1 0 0 0-1 1a1 1 0 0 0 1 1a1 1 0 0 0 1-1a1 1 0 0 0-1-1M3 8v2h8V8zm10 0v2h8V8z"></path></svg><p data-v-81fdcb80="" class="transition-all duration-300 whitespace-nowrap overflow-hidden opacity-100 max-w-[120px] ml-3">邀请好友</p></div><!----></div></div><div data-v-81fdcb80="" class="menu-item h-[40px] flex items-center px-4 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200"><div data-v-81fdcb80="" class="flex items-center w-full"><svg data-v-104cf9eb="" data-v-81fdcb80="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon shrink-0 shrink-0 iconify iconify--ic" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H8V4h12zM12 5.5v9l6-4.5z"></path></svg><p data-v-81fdcb80="" class="ml-3 transition-all duration-300 whitespace-nowrap overflow-hidden opacity-100 max-w-[120px]">火宝短剧</p></div></div><div data-v-81fdcb80="" class="menu-item h-[40px] flex items-center px-4 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200"><div data-v-81fdcb80="" class="flex items-center w-full"><svg data-v-104cf9eb="" data-v-81fdcb80="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon shrink-0 shrink-0 iconify iconify--basil" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M15.75 13a.75.75 0 0 0-.75-.75H9a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 .75-.75m0 4a.75.75 0 0 0-.75-.75H9a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 .75-.75"></path><path fill="currentColor" fill-rule="evenodd" d="M7 2.25A2.75 2.75 0 0 0 4.25 5v14A2.75 2.75 0 0 0 7 21.75h10A2.75 2.75 0 0 0 19.75 19V7.968c0-.381-.124-.751-.354-1.055l-2.998-3.968a1.75 1.75 0 0 0-1.396-.695zM5.75 5c0-.69.56-1.25 1.25-1.25h7.25v4.397c0 .414.336.75.75.75h3.25V19c0 .69-.56 1.25-1.25 1.25H7c-.69 0-1.25-.56-1.25-1.25z" clip-rule="evenodd"></path></svg><p data-v-81fdcb80="" class="ml-3 transition-all duration-300 whitespace-nowrap overflow-hidden opacity-100 max-w-[120px]">开放平台</p></div></div><!----><div data-v-81fdcb80="" class="menu-item h-[40px] flex items-center px-4 mx-2 mb-2 rounded-lg cursor-pointer transition-all duration-200"><div data-v-81fdcb80="" class="flex items-center w-full"><svg data-v-104cf9eb="" data-v-81fdcb80="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon shrink-0 shrink-0 iconify iconify--material-symbols" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="m12 22l-.25-3h-.25q-3.55 0-6.025-2.475T3 10.5t2.475-6.025T11.5 2q1.775 0 3.313.662t2.7 1.825t1.824 2.7T20 10.5q0 1.875-.612 3.6t-1.676 3.2t-2.525 2.675T12 22m2-3.65q1.775-1.5 2.888-3.512T18 10.5q0-2.725-1.888-4.612T11.5 4T6.888 5.888T5 10.5t1.888 4.613T11.5 17H14zm-1.8-2.675q.3-.3.3-.725t-.3-.725t-.725-.3t-.725.3t-.3.725t.3.725t.725.3t.725-.3M10.75 12.8h1.5q0-.75.15-1.05t.95-1.1q.45-.45.75-.975t.3-1.125q0-1.275-.862-1.912T11.5 6q-1.1 0-1.85.613T8.6 8.1l1.4.55q.125-.425.475-.837T11.5 7.4t1.013.375t.337.825q0 .425-.25.763t-.6.687q-.875.75-1.062 1.188T10.75 12.8m.75-1.625"></path></svg><p data-v-81fdcb80="" class="ml-3 transition-all duration-300 whitespace-nowrap overflow-hidden opacity-100 max-w-[120px]">联系我们</p></div></div><!----><div data-v-81fdcb80="" class="menu-item profile-item h-[40px] flex items-center px-4 mx-2 mb-2 rounded-lg cursor-pointer transition-all duration-200 relative"><div data-v-81fdcb80="" class="flex items-center flex-1 min-w-0"><svg data-v-104cf9eb="" data-v-81fdcb80="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon shrink-0 shrink-0 iconify iconify--gg" width="20" height="20" viewBox="0 0 24 24"><g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M16 9a4 4 0 1 1-8 0a4 4 0 0 1 8 0m-2 0a2 2 0 1 1-4 0a2 2 0 0 1 4 0"></path><path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11s11-4.925 11-11S18.075 1 12 1M3 12c0 2.09.713 4.014 1.908 5.542A8.99 8.99 0 0 1 12.065 14a8.98 8.98 0 0 1 7.092 3.458A9 9 0 1 0 3 12m9 9a8.96 8.96 0 0 1-5.672-2.012A6.99 6.99 0 0 1 12.065 16a6.99 6.99 0 0 1 5.689 2.92A8.96 8.96 0 0 1 12 21"></path></g></svg><p data-v-81fdcb80="" class="ml-3 transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis opacity-100">用户3184_937</p></div><!----></div></div><!----><template data-v-380a20da=""></template></div><div data-v-09e383b3="" class="content-wrapper"><div data-v-09e383b3="" class="main-container"><main data-v-09e383b3="" class="content-area"><div data-v-09e383b3="" class="content-container"><div data-v-be1df3d5="" data-v-09e383b3="" class="home-page h-full overflow-auto flex flex-col"><div data-v-be1df3d5="" class="creative-grid"><div data-v-be1df3d5="" class="grid-main"><div data-v-be1df3d5="" class="left-banner"><div data-v-be1df3d5="" class="n-carousel n-carousel--bottom n-carousel--horizontal n-carousel--slide" style="--n-bezier: cubic-bezier(.4, 0, .2, 1); --n-dot-color: rgba(255, 255, 255, .3); --n-dot-color-focus: rgba(255, 255, 255, .5); --n-dot-color-active: rgba(255, 255, 255, 1); --n-dot-size: 8px; --n-dot-line-width: 16px; --n-dot-line-width-active: 24px; --n-arrow-color: #eee;"><div class="n-carousel__slides" role="listbox" style="transition-duration: 0ms; transform: translateX(-1866px);"><div class="n-carousel__slide" role="option" tabindex="-1" data-index="0" aria-hidden="true" style="margin-right: 0px;"><div data-v-be1df3d5="" class="banner-item"><img data-v-be1df3d5="" src="https://ffile.chatfire.site/miniapp/banner02.png" alt="诗和远方" class="banner-img"></div></div><div class="n-carousel__slide" role="option" tabindex="-1" data-index="1" aria-hidden="true" style="margin-right: 0px;"><div data-v-be1df3d5="" class="banner-item"><img data-v-be1df3d5="" src="https://ffile.chatfire.site/miniapp/banner03.png" alt="疯狂动物城" class="banner-img"></div></div><div class="n-carousel__slide n-carousel__slide--prev" role="option" tabindex="-1" data-index="2" aria-hidden="true" style="margin-right: 0px;"><div data-v-be1df3d5="" class="banner-item"><img data-v-be1df3d5="" src="https://ffile.chatfire.site/miniapp/banner01.png" alt="圣诞装扮" class="banner-img"></div></div><div class="n-carousel__slide n-carousel__slide--current" role="option" tabindex="-1" data-index="3" aria-hidden="false" style="margin-right: 0px;"><div data-v-be1df3d5="" class="banner-item"><img data-v-be1df3d5="" src="https://ffile.chatfire.site/miniapp/banner02.png" alt="诗和远方" class="banner-img"></div></div><div class="n-carousel__slide n-carousel__slide--next" role="option" tabindex="-1" data-index="4" aria-hidden="true" style="margin-right: 0px;"><div data-v-be1df3d5="" class="banner-item"><img data-v-be1df3d5="" src="https://ffile.chatfire.site/miniapp/banner03.png" alt="疯狂动物城" class="banner-img"></div></div></div><div class="n-carousel__dots n-carousel__dots--dot" role="tablist"><div aria-selected="false" role="button" tabindex="0" class="n-carousel__dot"></div><div aria-selected="false" role="button" tabindex="0" class="n-carousel__dot"></div><div aria-selected="true" role="button" tabindex="0" class="n-carousel__dot n-carousel__dot--active"></div></div><!----></div></div><div data-v-be1df3d5="" class="right-apps"><div data-v-be1df3d5="" class="app-card"><div data-v-be1df3d5="" class="card-bg" style="background-image: url(&quot;https://ffile.chatfire.site/image/covers/christmas-cover.png&quot;);"></div><div data-v-be1df3d5="" class="card-overlay"></div><div data-v-be1df3d5="" class="card-content"><h3 data-v-be1df3d5="" class="card-title">戴个圣诞帽</h3><p data-v-be1df3d5="" class="card-desc">一键为照片添加圣诞帽</p></div><div data-v-be1df3d5="" class="card-actions"><button data-v-be1df3d5="" class="action-btn primary-btn"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></button></div></div><div data-v-be1df3d5="" class="app-card"><div data-v-be1df3d5="" class="card-bg" style="background-image: url(&quot;https://ffile.chatfire.site/miniapp/cover01.png&quot;);"></div><div data-v-be1df3d5="" class="card-overlay"></div><div data-v-be1df3d5="" class="card-content"><h3 data-v-be1df3d5="" class="card-title">疯狂动物城</h3><p data-v-be1df3d5="" class="card-desc">与动物城明星合影</p></div><div data-v-be1df3d5="" class="card-actions"><button data-v-be1df3d5="" class="action-btn primary-btn"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></button></div></div><div data-v-be1df3d5="" class="app-card"><div data-v-be1df3d5="" class="card-bg" style="background-image: url(&quot;https://ffile.chatfire.site/miniapp/sd1.jpg&quot;);"></div><div data-v-be1df3d5="" class="card-overlay"></div><div data-v-be1df3d5="" class="card-content"><h3 data-v-be1df3d5="" class="card-title">圣诞装扮</h3><p data-v-be1df3d5="" class="card-desc">圣诞魔法，温馨变装</p></div><div data-v-be1df3d5="" class="card-actions"><button data-v-be1df3d5="" class="action-btn primary-btn"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></button></div></div><div data-v-be1df3d5="" class="app-card"><div data-v-be1df3d5="" class="card-bg" style="background-image: url(&quot;https://ffile.chatfire.site/miniapp/p1-1.jpg&quot;);"></div><div data-v-be1df3d5="" class="card-overlay"></div><div data-v-be1df3d5="" class="card-content"><h3 data-v-be1df3d5="" class="card-title">诗和远方</h3><p data-v-be1df3d5="" class="card-desc">诗意旅程，自由浪漫</p></div><div data-v-be1df3d5="" class="card-actions"><button data-v-be1df3d5="" class="action-btn primary-btn"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></button></div></div></div></div></div><div data-v-be1df3d5="" class="filter-bar"><div data-v-be1df3d5="" class="filter-header"><h2 data-v-be1df3d5="" class="section-title">创作广场</h2><div data-v-be1df3d5="" class="filter-tabs"><div data-v-be1df3d5="" class="tab-item active"> 图片 </div><div data-v-be1df3d5="" class="tab-item"> 视频 </div></div></div></div><div data-v-be1df3d5="" class="flex-1" style="padding-bottom: 140px;"><div data-v-be1df3d5="" class="waterfall-container w-full flex gap-1"><div data-v-be1df3d5="" class="waterfall-column flex flex-col gap-1 flex-1"><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 426.6px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/f2211ac0bae6484898a0b340f43528e7_20251221_095955_26cd6c2e.png" alt="高定羊毛毡作品，摆件，艺术家Kim Jung Gi设计风格，高饱和色系，极繁主义，神秘感，细节完美，极致光影，杰作。 画面主体是一个巨大的红色萝卜形状的房子，顶部长着茂密的绿色萝卜叶。房子位于一个郁郁葱葱的花园中，周围环绕着各种颜色的花朵和绿色植物，窗户上种着盆栽。色彩鲜艳明快，以绿色、红色和黄色为主色调。构图采用近景视角，突出萝卜房子的细节，背景有蓝天和白云，营造出温馨和谐的氛围。房子门口有小兔子。 高品质细节，超高清分辨率，最佳品质，笔触清晰，高饱和度，光影对比，电影质感。32k超高清细致修复。 画面顶部（左、中右、位置）有极细无衬线白色字体&quot;XUX&quot;、&quot;2025&quot;、&quot;CREATE&quot;，左下角标注有极细无衬线白色字体 “AI-Generated” ，右下角标注有极细无衬线白色字体 “Design Empowerment”。" aria-label="高定羊毛毡作品，摆件，艺术家Kim Jung Gi设计风格，高饱和色系，极繁主义，神秘感，细节完美，极致光影，杰作。 画面主体是一个巨大的红色萝卜形状的房子，顶部长着茂密的绿色萝卜叶。房子位于一个郁郁葱葱的花园中，周围环绕着各种颜色的花朵和绿色植物，窗户上种着盆栽。色彩鲜艳明快，以绿色、红色和黄色为主色调。构图采用近景视角，突出萝卜房子的细节，背景有蓝天和白云，营造出温馨和谐的氛围。房子门口有小兔子。 高品质细节，超高清分辨率，最佳品质，笔触清晰，高饱和度，光影对比，电影质感。32k超高清细致修复。 画面顶部（左、中右、位置）有极细无衬线白色字体&quot;XUX&quot;、&quot;2025&quot;、&quot;CREATE&quot;，左下角标注有极细无衬线白色字体 “AI-Generated” ，右下角标注有极细无衬线白色字体 “Design Empowerment”。" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/f2211ac0bae6484898a0b340f43528e7_20251221_095955_26cd6c2e.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">高定羊毛毡作品，摆件，艺术家Kim Jung Gi设计风格，高饱和色系，极繁主义，神秘感，细节完美，极致光影，杰作。 画面主体是一个巨大的红色萝卜形状的房子，顶部长着茂密的绿色萝卜叶。房子位于一个郁郁葱葱的花园中，周围环绕着各种颜色的花朵和绿色植物，窗户上种着盆栽。色彩鲜艳明快，以绿色、红色和黄色为主色调。构图采用近景视角，突出萝卜房子的细节，背景有蓝天和白云，营造出温馨和谐的氛围。房子门口有小兔子。 高品质细节，超高清分辨率，最佳品质，笔触清晰，高饱和度，光影对比，电影质感。32k超高清细致修复。 画面顶部（左、中右、位置）有极细无衬线白色字体"XUX"、"2025"、"CREATE"，左下角标注有极细无衬线白色字体 “AI-Generated” ，右下角标注有极细无衬线白色字体 “Design Empowerment”。</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/f4708e578e054f31ba3a0f90fc4c0edf_20251217_160656_132cf4eb.png" alt="保留原图质感，为图片添加圣诞帽，帽子方向向右。人物不要动" aria-label="保留原图质感，为图片添加圣诞帽，帽子方向向右。人物不要动" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/f4708e578e054f31ba3a0f90fc4c0edf_20251217_160656_132cf4eb.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">保留原图质感，为图片添加圣诞帽，帽子方向向右。人物不要动</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/9ccaf4f0707b47c99d7b685bc710dddf_20250730_113041_a2f5a0d5.image" alt="梅西的卡通图像，抽象，夸张，高清细节，深蓝色背景。迪士尼梦工厂风格。 3D卡通，伦勃朗光" aria-label="梅西的卡通图像，抽象，夸张，高清细节，深蓝色背景。迪士尼梦工厂风格。 3D卡通，伦勃朗光" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/9ccaf4f0707b47c99d7b685bc710dddf_20250730_113041_a2f5a0d5.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">梅西的卡通图像，抽象，夸张，高清细节，深蓝色背景。迪士尼梦工厂风格。 3D卡通，伦勃朗光</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/f66ff5b3e5b0466dba51696fd38065fc_20250730_073500_c2fda4d1.image" alt="“画图问答找火宝，模型切换不用愁”采用复古风格的印刷字体建模，模拟大字报的古朴感。字母由色彩鲜艳的毛线缠绕而成，毛线的粗细有变化，部分地方还打着结，增加手工感。背景是一块淡黄色的绒布，绒布表面有细腻的绒毛，反射出柔和的光线。毛线字母在绒布背景的衬托下显得十分醒目，营造出温暖、柔软且富有生活气息的氛围，就像一幅充满童趣的手工艺品。" aria-label="“画图问答找火宝，模型切换不用愁”采用复古风格的印刷字体建模，模拟大字报的古朴感。字母由色彩鲜艳的毛线缠绕而成，毛线的粗细有变化，部分地方还打着结，增加手工感。背景是一块淡黄色的绒布，绒布表面有细腻的绒毛，反射出柔和的光线。毛线字母在绒布背景的衬托下显得十分醒目，营造出温暖、柔软且富有生活气息的氛围，就像一幅充满童趣的手工艺品。" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/f66ff5b3e5b0466dba51696fd38065fc_20250730_073500_c2fda4d1.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">“画图问答找火宝，模型切换不用愁”采用复古风格的印刷字体建模，模拟大字报的古朴感。字母由色彩鲜艳的毛线缠绕而成，毛线的粗细有变化，部分地方还打着结，增加手工感。背景是一块淡黄色的绒布，绒布表面有细腻的绒毛，反射出柔和的光线。毛线字母在绒布背景的衬托下显得十分醒目，营造出温暖、柔软且富有生活气息的氛围，就像一幅充满童趣的手工艺品。</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 505.477px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/a67796930ce14ce582851f0a8138a78f_20250729_230745_ea271c1d.image" alt="Moody and evocative, this a woman exudes captivating emotional depth. Inspired by Natalia Drepina's dramatic style, the image is bathed in rich, film tones and high contrast, accentuating the subject's delicate features. Soft, warm light is picking out her porcelain-like skin from intricate shadows, that hint at the melancholy and wistfulness  permeating the atmosphere. The overall mood is contemplative and introspective, inviting the viewer to empathize with the subject's emotional state.
" aria-label="Moody and evocative, this a woman exudes captivating emotional depth. Inspired by Natalia Drepina's dramatic style, the image is bathed in rich, film tones and high contrast, accentuating the subject's delicate features. Soft, warm light is picking out her porcelain-like skin from intricate shadows, that hint at the melancholy and wistfulness  permeating the atmosphere. The overall mood is contemplative and introspective, inviting the viewer to empathize with the subject's emotional state.
" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/a67796930ce14ce582851f0a8138a78f_20250729_230745_ea271c1d.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">Moody and evocative, this a woman exudes captivating emotional depth. Inspired by Natalia Drepina's dramatic style, the image is bathed in rich, film tones and high contrast, accentuating the subject's delicate features. Soft, warm light is picking out her porcelain-like skin from intricate shadows, that hint at the melancholy and wistfulness  permeating the atmosphere. The overall mood is contemplative and introspective, inviting the viewer to empathize with the subject's emotional state.
</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div></div><div data-v-be1df3d5="" class="waterfall-column flex flex-col gap-1 flex-1"><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 505.6px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/acacb0bc310944bab324c5a769a2260b_20251221_095655_45c5e32a.png" alt="背景是疯狂动物城的城市风光，我的面前是《疯狂动物城》里的兔朱迪（穿着警服）和狐尼克，它们并排站在我面前抬头看着我，表情生动，邀请加入的手势。画面温暖可爱，3D动画风格，超细节，质感真实，电影级光线。" aria-label="背景是疯狂动物城的城市风光，我的面前是《疯狂动物城》里的兔朱迪（穿着警服）和狐尼克，它们并排站在我面前抬头看着我，表情生动，邀请加入的手势。画面温暖可爱，3D动画风格，超细节，质感真实，电影级光线。" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/acacb0bc310944bab324c5a769a2260b_20251221_095655_45c5e32a.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">背景是疯狂动物城的城市风光，我的面前是《疯狂动物城》里的兔朱迪（穿着警服）和狐尼克，它们并排站在我面前抬头看着我，表情生动，邀请加入的手势。画面温暖可爱，3D动画风格，超细节，质感真实，电影级光线。</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 189.693px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/426260b9e1a448c5920bc183666a6077_20250822_145507_892da26e.png" alt="一幅充满活力和细节感的厦门城市插画，把所有著名地标建筑集中在一张图中。画面中包括鼓浪屿日光岩与八卦楼、厦门大学嘉庚楼群、南普陀寺、世茂海峡大厦双子塔、环岛路“一国两制”沙滩、铁路文化公园、曾厝垵牌坊、集美学村、五缘湾大桥。画面中央用蔚蓝海面与环岛路并行，海面白帆与对岸灯火辉映。背景设定为初夏傍晚，橘粉晚霞与金色海面交织，城市灯光渐亮，半写实风格，色彩明亮，气氛热烈有活力。细节拉满" aria-label="一幅充满活力和细节感的厦门城市插画，把所有著名地标建筑集中在一张图中。画面中包括鼓浪屿日光岩与八卦楼、厦门大学嘉庚楼群、南普陀寺、世茂海峡大厦双子塔、环岛路“一国两制”沙滩、铁路文化公园、曾厝垵牌坊、集美学村、五缘湾大桥。画面中央用蔚蓝海面与环岛路并行，海面白帆与对岸灯火辉映。背景设定为初夏傍晚，橘粉晚霞与金色海面交织，城市灯光渐亮，半写实风格，色彩明亮，气氛热烈有活力。细节拉满" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/426260b9e1a448c5920bc183666a6077_20250822_145507_892da26e.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">一幅充满活力和细节感的厦门城市插画，把所有著名地标建筑集中在一张图中。画面中包括鼓浪屿日光岩与八卦楼、厦门大学嘉庚楼群、南普陀寺、世茂海峡大厦双子塔、环岛路“一国两制”沙滩、铁路文化公园、曾厝垵牌坊、集美学村、五缘湾大桥。画面中央用蔚蓝海面与环岛路并行，海面白帆与对岸灯火辉映。背景设定为初夏傍晚，橘粉晚霞与金色海面交织，城市灯光渐亮，半写实风格，色彩明亮，气氛热烈有活力。细节拉满</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/53d0891ae2b94060bd6729e9259497d6_20250730_131335_d9e66714.image" alt="图片风格为「人像摄影」，身穿黑色紧身裙的女孩在红色房间里，柔和的照明，电影般的阴影，侧面，" aria-label="图片风格为「人像摄影」，身穿黑色紧身裙的女孩在红色房间里，柔和的照明，电影般的阴影，侧面，" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/53d0891ae2b94060bd6729e9259497d6_20250730_131335_d9e66714.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">图片风格为「人像摄影」，身穿黑色紧身裙的女孩在红色房间里，柔和的照明，电影般的阴影，侧面，</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/8ae59251eaba4aa59a3887d66b3cc7ef_20250730_073800_5661b3fd.image" alt="一位台灣女孩在西子灣海上玩sup，穿著清涼，全身，弄得全身都髒了，但是玩得很開心盡興，夕陽 " aria-label="一位台灣女孩在西子灣海上玩sup，穿著清涼，全身，弄得全身都髒了，但是玩得很開心盡興，夕陽 " loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/8ae59251eaba4aa59a3887d66b3cc7ef_20250730_073800_5661b3fd.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">一位台灣女孩在西子灣海上玩sup，穿著清涼，全身，弄得全身都髒了，但是玩得很開心盡興，夕陽 </p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 505.477px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/a68d05d46be649dcbc0b055b183fd83a_20250729_230809_4b4cd240.image" alt="An ascetic woman in a red dress, delicate white, cinematic lighting and tone, hopeful, atmospheric.
" aria-label="An ascetic woman in a red dress, delicate white, cinematic lighting and tone, hopeful, atmospheric.
" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/a68d05d46be649dcbc0b055b183fd83a_20250729_230809_4b4cd240.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">An ascetic woman in a red dress, delicate white, cinematic lighting and tone, hopeful, atmospheric.
</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div></div><div data-v-be1df3d5="" class="waterfall-column flex flex-col gap-1 flex-1"><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 379.254px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/42c39e98bf6a47f9b76788e32e229234_20251218_221855_ab30c284.png" alt="给图中的人物进行圣诞装扮，保证人物脸部特征。 发间点缀白色毛绒球 + 红色小丝带装饰；可爱圣诞风妆容：沿着眼睛下方到脸颊满铺红色、粉色(荧光阴影)大小不同的爱心 / 心形腮红、闪亮珠光眼妆、饱满亮红色唇妆；身着红丝绒材质的圣诞主题服饰（带白色毛绒包边、胸前白色毛球装饰），搭配同材质大蝴蝶结颈饰；手部比出俏皮指向前方的姿势，手腕佩戴细手链；室内暖黄色柔和灯光，温馨甜美氛围，高清特写镜头，细腻皮肤质感，元气可爱风格，浅景深突出主体" aria-label="给图中的人物进行圣诞装扮，保证人物脸部特征。 发间点缀白色毛绒球 + 红色小丝带装饰；可爱圣诞风妆容：沿着眼睛下方到脸颊满铺红色、粉色(荧光阴影)大小不同的爱心 / 心形腮红、闪亮珠光眼妆、饱满亮红色唇妆；身着红丝绒材质的圣诞主题服饰（带白色毛绒包边、胸前白色毛球装饰），搭配同材质大蝴蝶结颈饰；手部比出俏皮指向前方的姿势，手腕佩戴细手链；室内暖黄色柔和灯光，温馨甜美氛围，高清特写镜头，细腻皮肤质感，元气可爱风格，浅景深突出主体" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/42c39e98bf6a47f9b76788e32e229234_20251218_221855_ab30c284.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">给图中的人物进行圣诞装扮，保证人物脸部特征。 发间点缀白色毛绒球 + 红色小丝带装饰；可爱圣诞风妆容：沿着眼睛下方到脸颊满铺红色、粉色(荧光阴影)大小不同的爱心 / 心形腮红、闪亮珠光眼妆、饱满亮红色唇妆；身着红丝绒材质的圣诞主题服饰（带白色毛绒包边、胸前白色毛球装饰），搭配同材质大蝴蝶结颈饰；手部比出俏皮指向前方的姿势，手腕佩戴细手链；室内暖黄色柔和灯光，温馨甜美氛围，高清特写镜头，细腻皮肤质感，元气可爱风格，浅景深突出主体</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/49063c7dd1b6454e9c63d47bd6829c90_20251217_222555_92c8656f.png" alt="&lt;lora:addielyn_v1_chilloutmix_NiPrunedFp16Fix_100_33pic_epoc:0.6666&gt; extremely detailed （(addielyn）)， detailed eyes， （Best quality details:1.2），realistic，8K High definition，(1girl:1.2)，Ultra Detailed，High quality texture，intricate details，detailed texture，finely detailed，high detail，extremely detailed cg，High quality shadow，Detailed beautiful delicate face，Detailed beautiful delicate eyes，Depth of field，Ray tracing，(a beautiful25age years old sexy korean woman:1.1)，medium breast， tall_female， beautiful_legs， Glow Eyes，blush， perfect body，skinny， (black sweater:1.4)， (open grey coat:1)，(short plaid tight skirt :1.2)， (stockings_garterbelt:1.1， stilleto:1.1)， (bob cut:1.1)， street， sunlight， kneeling on sofa， earrings，necklace， model， looking at viewer， from side， dynamic pose， mole under eye，" aria-label="&lt;lora:addielyn_v1_chilloutmix_NiPrunedFp16Fix_100_33pic_epoc:0.6666&gt; extremely detailed （(addielyn）)， detailed eyes， （Best quality details:1.2），realistic，8K High definition，(1girl:1.2)，Ultra Detailed，High quality texture，intricate details，detailed texture，finely detailed，high detail，extremely detailed cg，High quality shadow，Detailed beautiful delicate face，Detailed beautiful delicate eyes，Depth of field，Ray tracing，(a beautiful25age years old sexy korean woman:1.1)，medium breast， tall_female， beautiful_legs， Glow Eyes，blush， perfect body，skinny， (black sweater:1.4)， (open grey coat:1)，(short plaid tight skirt :1.2)， (stockings_garterbelt:1.1， stilleto:1.1)， (bob cut:1.1)， street， sunlight， kneeling on sofa， earrings，necklace， model， looking at viewer， from side， dynamic pose， mole under eye，" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/49063c7dd1b6454e9c63d47bd6829c90_20251217_222555_92c8656f.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">&lt;lora:addielyn_v1_chilloutmix_NiPrunedFp16Fix_100_33pic_epoc:0.6666&gt; extremely detailed （(addielyn）)， detailed eyes， （Best quality details:1.2），realistic，8K High definition，(1girl:1.2)，Ultra Detailed，High quality texture，intricate details，detailed texture，finely detailed，high detail，extremely detailed cg，High quality shadow，Detailed beautiful delicate face，Detailed beautiful delicate eyes，Depth of field，Ray tracing，(a beautiful25age years old sexy korean woman:1.1)，medium breast， tall_female， beautiful_legs， Glow Eyes，blush， perfect body，skinny， (black sweater:1.4)， (open grey coat:1)，(short plaid tight skirt :1.2)， (stockings_garterbelt:1.1， stilleto:1.1)， (bob cut:1.1)， street， sunlight， kneeling on sofa， earrings，necklace， model， looking at viewer， from side， dynamic pose， mole under eye，</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/fe253bfe742b40fe8ce3cb47d41ed3b9_20250821_185907_1ffbc593.png" alt="Chinese ink-wash manga style, black and white, dramatic lighting, high contrast" aria-label="Chinese ink-wash manga style, black and white, dramatic lighting, high contrast" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/fe253bfe742b40fe8ce3cb47d41ed3b9_20250821_185907_1ffbc593.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">Chinese ink-wash manga style, black and white, dramatic lighting, high contrast</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 505.477px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/16c87ffce31a4c9aa18b7de61c0c6b1a_20250730_074106_31c3f98e.image" alt="4個台日韓中的女孩躺著，穿無肩帶黑衣，星巴克圍裙，朝著，私人飛機上，私人物品整齊放在旁邊，全身肖像，俯拍" aria-label="4個台日韓中的女孩躺著，穿無肩帶黑衣，星巴克圍裙，朝著，私人飛機上，私人物品整齊放在旁邊，全身肖像，俯拍" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/16c87ffce31a4c9aa18b7de61c0c6b1a_20250730_074106_31c3f98e.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">4個台日韓中的女孩躺著，穿無肩帶黑衣，星巴克圍裙，朝著，私人飛機上，私人物品整齊放在旁邊，全身肖像，俯拍</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/c188e4334a794f2d8e8871808987fca7_20250729_230533_ed4765db.image" alt="这张照片中的场景令人心醉，一位年轻女子穿着一条裙子，站在海边，背对着镜头，凝视着地平线下的夕阳。太阳已经沉入了海面，一片金黄色的光芒在海面上弥漫，照亮了整片海洋，仿佛这个时刻被定格在了时间的某个角落里。女子的头发随着微风轻轻飘动，轮廓被余晖映照得柔和而温暖。她的目光凝视着远方，仿佛在思考着生命的意义和无尽的未来。这张照片中蕴含着一种深刻的内涵，让人感受到时间和自然的力量，也让人思考着自己在这个宏大而美丽的世界中的角色和意义。" aria-label="这张照片中的场景令人心醉，一位年轻女子穿着一条裙子，站在海边，背对着镜头，凝视着地平线下的夕阳。太阳已经沉入了海面，一片金黄色的光芒在海面上弥漫，照亮了整片海洋，仿佛这个时刻被定格在了时间的某个角落里。女子的头发随着微风轻轻飘动，轮廓被余晖映照得柔和而温暖。她的目光凝视着远方，仿佛在思考着生命的意义和无尽的未来。这张照片中蕴含着一种深刻的内涵，让人感受到时间和自然的力量，也让人思考着自己在这个宏大而美丽的世界中的角色和意义。" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/c188e4334a794f2d8e8871808987fca7_20250729_230533_ed4765db.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">这张照片中的场景令人心醉，一位年轻女子穿着一条裙子，站在海边，背对着镜头，凝视着地平线下的夕阳。太阳已经沉入了海面，一片金黄色的光芒在海面上弥漫，照亮了整片海洋，仿佛这个时刻被定格在了时间的某个角落里。女子的头发随着微风轻轻飘动，轮廓被余晖映照得柔和而温暖。她的目光凝视着远方，仿佛在思考着生命的意义和无尽的未来。这张照片中蕴含着一种深刻的内涵，让人感受到时间和自然的力量，也让人思考着自己在这个宏大而美丽的世界中的角色和意义。</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div></div><div data-v-be1df3d5="" class="waterfall-column flex flex-col gap-1 flex-1"><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/9909203018eb474baec37426beed559e_20251218_152655_d9c0b45b.png" alt="风格转换，动漫风格，氛围很棒" aria-label="风格转换，动漫风格，氛围很棒" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/9909203018eb474baec37426beed559e_20251218_152655_d9c0b45b.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">风格转换，动漫风格，氛围很棒</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 159.975px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/59239205f0244b5d9f13f1c41885c040_20251217_233355_626a5068.png" alt="白色狐仙在神秘的仙境中翩翩起舞，她的毛色纯净如雪，闪烁着柔和的光芒。狐仙的面容精致绝伦，嘴角带着淡淡的微笑，九条尾巴如梦幻般摇曳。她身着薄如蝉翼的白色羽衣，周围是盛开的白色莲花和飞舞的蝴蝶，此场景如梦如幻" aria-label="白色狐仙在神秘的仙境中翩翩起舞，她的毛色纯净如雪，闪烁着柔和的光芒。狐仙的面容精致绝伦，嘴角带着淡淡的微笑，九条尾巴如梦幻般摇曳。她身着薄如蝉翼的白色羽衣，周围是盛开的白色莲花和飞舞的蝴蝶，此场景如梦如幻" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/59239205f0244b5d9f13f1c41885c040_20251217_233355_626a5068.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">白色狐仙在神秘的仙境中翩翩起舞，她的毛色纯净如雪，闪烁着柔和的光芒。狐仙的面容精致绝伦，嘴角带着淡淡的微笑，九条尾巴如梦幻般摇曳。她身着薄如蝉翼的白色羽衣，周围是盛开的白色莲花和飞舞的蝴蝶，此场景如梦如幻</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 159.955px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/ffa845fcf68848419d6a1d9bc8f34d3a_20250915_080024_d9e8ca50.png" alt="变形金刚大战" aria-label="变形金刚大战" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/ffa845fcf68848419d6a1d9bc8f34d3a_20250915_080024_d9e8ca50.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">变形金刚大战</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/11d445c7af784adcbaf279069a97ecb6_20250821_191109_db83c9e1.png" alt="中国风侠客水墨风格；Chinese ink-wash manga style, black and white, dramatic lighting, high contrast,  屋顶黑影掠过，盗贼剪影，月亮在背后

" aria-label="中国风侠客水墨风格；Chinese ink-wash manga style, black and white, dramatic lighting, high contrast,  屋顶黑影掠过，盗贼剪影，月亮在背后

" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/11d445c7af784adcbaf279069a97ecb6_20250821_191109_db83c9e1.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">中国风侠客水墨风格；Chinese ink-wash manga style, black and white, dramatic lighting, high contrast,  屋顶黑影掠过，盗贼剪影，月亮在背后

</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/0fdc4063e87d4a12bd3855e6be32f310_20250730_110724_473b3114.image" alt="​滔滔王子，在皮克斯和儿童读物插图的风格，特写镜头在一个红色的背景，3/4的侧面视图的头部看着相机，羊毛毛毡织物艺术，一个可爱和有趣的人物设计在莫威廉姆斯的风格，高清" aria-label="​滔滔王子，在皮克斯和儿童读物插图的风格，特写镜头在一个红色的背景，3/4的侧面视图的头部看着相机，羊毛毛毡织物艺术，一个可爱和有趣的人物设计在莫威廉姆斯的风格，高清" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/0fdc4063e87d4a12bd3855e6be32f310_20250730_110724_473b3114.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">​滔滔王子，在皮克斯和儿童读物插图的风格，特写镜头在一个红色的背景，3/4的侧面视图的头部看着相机，羊毛毛毡织物艺术，一个可爱和有趣的人物设计在莫威廉姆斯的风格，高清</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 505.477px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/60d1c9371d994baf950ceb29803b82ff_20250729_230851_2987d97d.image" alt="The center of the picture is a 20 - year - old girl in the Fashion Girls' Generation group dress type, surrounded by the same type of clothes and accessories neatly placed in equal proportion. Fuji camera, studio lighting, full body, high contrast colors. , knolling, pink" aria-label="The center of the picture is a 20 - year - old girl in the Fashion Girls' Generation group dress type, surrounded by the same type of clothes and accessories neatly placed in equal proportion. Fuji camera, studio lighting, full body, high contrast colors. , knolling, pink" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/60d1c9371d994baf950ceb29803b82ff_20250729_230851_2987d97d.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">The center of the picture is a 20 - year - old girl in the Fashion Girls' Generation group dress type, surrounded by the same type of clothes and accessories neatly placed in equal proportion. Fuji camera, studio lighting, full body, high contrast colors. , knolling, pink</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/38fb2b261c324c3896ed6ba6fda474a2_20250729_230045_900e3b59.image" alt="近距离，融合Becca Doodlefly、Sandara Tang的细腻渐变和天野喜孝的飘逸装饰，使用水彩厚涂技法搭配哑光质感，强调人物轮廓，整体呈现胶片颗粒感与电影风碰撞的美感。俯视镜头，田园感，高斯模糊，晕染，阴影细节丰富，透视感强烈，波普艺术融合野兽派风格。Lnplick风格时尚韩系美少女，全身，高跟鞋，抬头，风吹起裙摆，随意坐姿，在草坡上，夕阳染色头发轮廓，蓝天背景，眼线，眼影，长直发，波波头，发尾翘起，动人，动感，飘逸头发，发丝划过脸颊，突显发丝凌乱美，氛围感，眼部特写，厚唇，下垂眼，阴影，暗调前景。" aria-label="近距离，融合Becca Doodlefly、Sandara Tang的细腻渐变和天野喜孝的飘逸装饰，使用水彩厚涂技法搭配哑光质感，强调人物轮廓，整体呈现胶片颗粒感与电影风碰撞的美感。俯视镜头，田园感，高斯模糊，晕染，阴影细节丰富，透视感强烈，波普艺术融合野兽派风格。Lnplick风格时尚韩系美少女，全身，高跟鞋，抬头，风吹起裙摆，随意坐姿，在草坡上，夕阳染色头发轮廓，蓝天背景，眼线，眼影，长直发，波波头，发尾翘起，动人，动感，飘逸头发，发丝划过脸颊，突显发丝凌乱美，氛围感，眼部特写，厚唇，下垂眼，阴影，暗调前景。" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/38fb2b261c324c3896ed6ba6fda474a2_20250729_230045_900e3b59.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">近距离，融合Becca Doodlefly、Sandara Tang的细腻渐变和天野喜孝的飘逸装饰，使用水彩厚涂技法搭配哑光质感，强调人物轮廓，整体呈现胶片颗粒感与电影风碰撞的美感。俯视镜头，田园感，高斯模糊，晕染，阴影细节丰富，透视感强烈，波普艺术融合野兽派风格。Lnplick风格时尚韩系美少女，全身，高跟鞋，抬头，风吹起裙摆，随意坐姿，在草坡上，夕阳染色头发轮廓，蓝天背景，眼线，眼影，长直发，波波头，发尾翘起，动人，动感，飘逸头发，发丝划过脸颊，突显发丝凌乱美，氛围感，眼部特写，厚唇，下垂眼，阴影，暗调前景。</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div></div><div data-v-be1df3d5="" class="waterfall-column flex flex-col gap-1 flex-1"><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 379.2px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/a65f3c16ba874a33849c9cef6f153e55_20251217_233455_678463a0.png" alt="高铁座位中，两位22岁的美女引人注目。她穿着印着个性文字的紧身衣服，短裙，凸显出身材曲线，有腹肌。口罩之上，是她清澈而灵动的双眸。旁边的扶手和小桌板增添了画面的真实感，此乃真实且精彩的摄影作品" aria-label="高铁座位中，两位22岁的美女引人注目。她穿着印着个性文字的紧身衣服，短裙，凸显出身材曲线，有腹肌。口罩之上，是她清澈而灵动的双眸。旁边的扶手和小桌板增添了画面的真实感，此乃真实且精彩的摄影作品" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/a65f3c16ba874a33849c9cef6f153e55_20251217_233455_678463a0.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">高铁座位中，两位22岁的美女引人注目。她穿着印着个性文字的紧身衣服，短裙，凸显出身材曲线，有腹肌。口罩之上，是她清澈而灵动的双眸。旁边的扶手和小桌板增添了画面的真实感，此乃真实且精彩的摄影作品</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 159.975px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/8db982b2461343d0814f9f685115b837_20251217_233155_c3a7f5dc.png" alt="Anime magical girl warrior, highly detailed, vibrant colors, dynamic pose, fantasy setting, glowing magical aura, intricate costume design, beautiful flowing hair, sparkling eyes, celestial background, ethereal lighting, ultra-realistic rendering." aria-label="Anime magical girl warrior, highly detailed, vibrant colors, dynamic pose, fantasy setting, glowing magical aura, intricate costume design, beautiful flowing hair, sparkling eyes, celestial background, ethereal lighting, ultra-realistic rendering." loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/8db982b2461343d0814f9f685115b837_20251217_233155_c3a7f5dc.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">Anime magical girl warrior, highly detailed, vibrant colors, dynamic pose, fantasy setting, glowing magical aura, intricate costume design, beautiful flowing hair, sparkling eyes, celestial background, ethereal lighting, ultra-realistic rendering.</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 189.693px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/44ba9375b8b949e286b966b489ac566c_20250822_142807_1d7f83ff.png" alt="西安 · 秦潮盛唐
地标同框：
“大雁塔” + “钟楼” + “大明宫丹凤门”
主色调：
长安朱红 → 鎏金 → 赛博青蓝
材质/细节：
塔身唐砖浮雕发霓虹金光，钟楼飞檐挂鎏金风铃光脉，丹凤门城墙做巨幅剪纸投影；夜空悬浮丝路驼队全息剪影
构图：
对称式，塔居中，钟楼左前景，丹凤门右后景，远处秦岭轮廓淡入" aria-label="西安 · 秦潮盛唐
地标同框：
“大雁塔” + “钟楼” + “大明宫丹凤门”
主色调：
长安朱红 → 鎏金 → 赛博青蓝
材质/细节：
塔身唐砖浮雕发霓虹金光，钟楼飞檐挂鎏金风铃光脉，丹凤门城墙做巨幅剪纸投影；夜空悬浮丝路驼队全息剪影
构图：
对称式，塔居中，钟楼左前景，丹凤门右后景，远处秦岭轮廓淡入" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/44ba9375b8b949e286b966b489ac566c_20250822_142807_1d7f83ff.png" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">西安 · 秦潮盛唐
地标同框：
“大雁塔” + “钟楼” + “大明宫丹凤门”
主色调：
长安朱红 → 鎏金 → 赛博青蓝
材质/细节：
塔身唐砖浮雕发霓虹金光，钟楼飞檐挂鎏金风铃光脉，丹凤门城墙做巨幅剪纸投影；夜空悬浮丝路驼队全息剪影
构图：
对称式，塔居中，钟楼左前景，丹凤门右后景，远处秦岭轮廓淡入</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/fca38735e3e54e26985531f244974384_20250730_112905_d5331fac.image" alt="9宫格表情包，哆啦a梦，三维效果，高清，风格可爱，动作：打瞌睡、求抱抱、卖萌、微笑、生气、流泪哭、委屈、难过、激动" aria-label="9宫格表情包，哆啦a梦，三维效果，高清，风格可爱，动作：打瞌睡、求抱抱、卖萌、微笑、生气、流泪哭、委屈、难过、激动" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/fca38735e3e54e26985531f244974384_20250730_112905_d5331fac.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">9宫格表情包，哆啦a梦，三维效果，高清，风格可爱，动作：打瞌睡、求抱抱、卖萌、微笑、生气、流泪哭、委屈、难过、激动</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 426.6px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/8d1c19d2547c44ff91ed7645f2282995_20250729_230939_9c2fa589.image" alt="photorealistic,masterpiece, best quality, sf6 chun,mature female, makeup, yellow ribbon, chinese clothing, white shirt, tight pants, blue pants,A stylized and modern interpretation of Chun-Li, incorporating contemporary fashion elements and a fresh take on her iconic outfit, against a backdrop of urban cityscape or futuristic scenery, digital illustration, art by Bengus and Stanley Lau (Artgerm), stylized, modern, highly detailed, trending on Artstation, concept art, sharp focus." aria-label="photorealistic,masterpiece, best quality, sf6 chun,mature female, makeup, yellow ribbon, chinese clothing, white shirt, tight pants, blue pants,A stylized and modern interpretation of Chun-Li, incorporating contemporary fashion elements and a fresh take on her iconic outfit, against a backdrop of urban cityscape or futuristic scenery, digital illustration, art by Bengus and Stanley Lau (Artgerm), stylized, modern, highly detailed, trending on Artstation, concept art, sharp focus." loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/8d1c19d2547c44ff91ed7645f2282995_20250729_230939_9c2fa589.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">photorealistic,masterpiece, best quality, sf6 chun,mature female, makeup, yellow ribbon, chinese clothing, white shirt, tight pants, blue pants,A stylized and modern interpretation of Chun-Li, incorporating contemporary fashion elements and a fresh take on her iconic outfit, against a backdrop of urban cityscape or futuristic scenery, digital illustration, art by Bengus and Stanley Lau (Artgerm), stylized, modern, highly detailed, trending on Artstation, concept art, sharp focus.</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/96f66be1bba24839a492c90a8c51969b_20250729_230657_76769993.image" alt="&lt;lora:addielyn_v1_chilloutmix_NiPrunedFp16Fix_100_33pic_epoc:0.6666&gt; extremely detailed （(addielyn）)， detailed eyes，

（Best quality details:1.2），realistic，8K High definition，(1girl:1.2)，Ultra Detailed，High quality texture，intricate details，detailed texture，finely detailed，high detail，extremely detailed cg，High quality shadow，Detailed beautiful delicate face，Detailed beautiful delicate eyes，Depth of field，Ray tracing，(a beautiful25age years old sexy korean woman:1.1)，medium breast， tall_female， beautiful_legs， Glow Eyes，blush， perfect body，skinny， (black sweater:1.4)， (open grey coat:1)，(short plaid tight skirt :1.2)， (stockings_garterbelt:1.1， stilleto:1.1)， (bob cut:1.1)， street， sunlight， kneeling on sofa， earrings，necklace， model， looking at viewer， from side， dynamic pose， mole under eye，" aria-label="&lt;lora:addielyn_v1_chilloutmix_NiPrunedFp16Fix_100_33pic_epoc:0.6666&gt; extremely detailed （(addielyn）)， detailed eyes，

（Best quality details:1.2），realistic，8K High definition，(1girl:1.2)，Ultra Detailed，High quality texture，intricate details，detailed texture，finely detailed，high detail，extremely detailed cg，High quality shadow，Detailed beautiful delicate face，Detailed beautiful delicate eyes，Depth of field，Ray tracing，(a beautiful25age years old sexy korean woman:1.1)，medium breast， tall_female， beautiful_legs， Glow Eyes，blush， perfect body，skinny， (black sweater:1.4)， (open grey coat:1)，(short plaid tight skirt :1.2)， (stockings_garterbelt:1.1， stilleto:1.1)， (bob cut:1.1)， street， sunlight， kneeling on sofa， earrings，necklace， model， looking at viewer， from side， dynamic pose， mole under eye，" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/96f66be1bba24839a492c90a8c51969b_20250729_230657_76769993.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">&lt;lora:addielyn_v1_chilloutmix_NiPrunedFp16Fix_100_33pic_epoc:0.6666&gt; extremely detailed （(addielyn）)， detailed eyes，

（Best quality details:1.2），realistic，8K High definition，(1girl:1.2)，Ultra Detailed，High quality texture，intricate details，detailed texture，finely detailed，high detail，extremely detailed cg，High quality shadow，Detailed beautiful delicate face，Detailed beautiful delicate eyes，Depth of field，Ray tracing，(a beautiful25age years old sexy korean woman:1.1)，medium breast， tall_female， beautiful_legs， Glow Eyes，blush， perfect body，skinny， (black sweater:1.4)， (open grey coat:1)，(short plaid tight skirt :1.2)， (stockings_garterbelt:1.1， stilleto:1.1)， (bob cut:1.1)， street， sunlight， kneeling on sofa， earrings，necklace， model， looking at viewer， from side， dynamic pose， mole under eye，</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div><div data-v-be1df3d5="" class="image-card cursor-pointer rounded" style="height: 284.4px;"><div data-v-be1df3d5="" class="w-full h-full object-cover n-image" role="none"><img src="https://ffile.chatfire.site/cf/chatfire-media/image/9c5de6faec18492caeee8109afcda45e_20250729_094603_68a685f1.image" alt="治愈系玉兔狗，极简，欧美插画风的卡通形象，由织物，棉花，毛毡毛绒组成，丑萌，可爱，柔软，治愈，极简，背景留白，挎着挎包，带着可爱的帽子，蓝天白云的户外。超大镜头特写，证件照的构图" aria-label="治愈系玉兔狗，极简，欧美插画风的卡通形象，由织物，棉花，毛毡毛绒组成，丑萌，可爱，柔软，治愈，极简，背景留白，挎着挎包，带着可爱的帽子，蓝天白云的户外。超大镜头特写，证件照的构图" loading="eager" data-error="false" data-preview-src="https://ffile.chatfire.site/cf/chatfire-media/image/9c5de6faec18492caeee8109afcda45e_20250729_094603_68a685f1.image" data-group-id="c2c277fbf" style="object-fit: cover;"><!----></div><div data-v-be1df3d5="" class="card-info p-3 absolute bottom-0 left-0 right-0"><p data-v-be1df3d5="" class="text-sm truncate ellipsis-2">治愈系玉兔狗，极简，欧美插画风的卡通形象，由织物，棉花，毛毡毛绒组成，丑萌，可爱，柔软，治愈，极简，背景留白，挎着挎包，带着可爱的帽子，蓝天白云的户外。超大镜头特写，证件照的构图</p><div data-v-be1df3d5="" class="flex justify-end items-center mt-2"><div data-v-be1df3d5="" class="actions flex items-center gap-1.5"><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--icon-park-outline" width="14" height="14" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path stroke-linecap="round" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672"></path><path d="M32.188 13H7.811A2.813 2.813 0 0 0 5 15.813v24.374A2.813 2.813 0 0 0 7.813 43h24.375A2.813 2.813 0 0 0 35 40.188V15.811A2.813 2.813 0 0 0 32.188 13Z"></path></g></svg><span data-v-be1df3d5="">复制</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m20 7l-.95-2.05L17 4l2.05-.95L20 1l.95 2.05L23 4l-2.05.95L20 7ZM8.5 7l-.95-2.05L5.5 4l2.05-.95L8.5 1l.95 2.05L11.5 4l-2.05.95L8.5 7ZM20 18.5l-.95-2.05L17 15.5l2.05-.95l.95-2.05l.95 2.05l2.05.95l-2.05.95L20 18.5ZM5.1 21.7l-2.8-2.8q-.3-.3-.3-.725t.3-.725L13.45 6.3q.3-.3.725-.3t.725.3l2.8 2.8q.3.3.3.725t-.3.725L6.55 21.7q-.3.3-.725.3t-.725-.3Zm9.075-10.475l1.4-1.4l-1.4-1.4l-1.4 1.4l1.4 1.4Z"></path></svg><span data-v-be1df3d5="">二创</span></div><div data-v-be1df3d5="" class="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-1.5 text-xs cursor-pointer"><svg data-v-104cf9eb="" data-v-be1df3d5="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--ri" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4.713 7.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319A4.37 4.37 0 0 0 3.276.931L3.53.32a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251m10.601 2.405l.143.142a5.5 5.5 0 0 1 1.356 5.245a5.505 5.505 0 0 1-5.311 4.078c-2.036 0-4.714-.625-6.973-1.514c1.205-1.414 1.645-2.809 1.8-4.679c.037-.451.06-.63.103-.79c.793-2.962 3.585-4.61 6.492-3.831c.93.25 1.742.724 2.39 1.349m2.914-7.162l-4.94 3.842c-3.946-.974-7.73 1.333-8.788 5.284c-.102.38-.134.765-.167 1.169c-.115 1.394-.247 3.005-3.333 5.33c2.5 1.5 7 3.002 10.502 3.002a7.505 7.505 0 0 0 7.283-9.291l3.84-4.938a1 1 0 0 0-.082-1.321L19.55 2.454a1 1 0 0 0-1.321-.083m-1.333 5.914a8 8 0 0 0-.194-.194l-1.124-1.124l3.182-2.475l1.746 1.746L18.03 9.42z"></path></svg><span data-v-be1df3d5="">画同款</span></div></div></div></div></div></div><!----></div></div><!----><div data-v-ff93ebb7="" class="material-input-container shadow-sm"><!----><div data-v-ff93ebb7="" class="toggle-bar"><div data-v-ff93ebb7="" class="toggle-handle"></div></div><!----><div data-v-ff93ebb7="" class="input-wrapper"><div data-v-ff93ebb7="" class="flex mb-2"><div data-v-ceeae103="" class="image-upload-stack"><!----><div data-v-ceeae103="" class="popover-content"><div data-v-ceeae103="" class="image-wrapper image-wrapper-common"><div data-v-ceeae103="" class="upload-image-seat w-full h-full rounded flex justify-center items-center bg-[var(--chatfire_bg_hover)] hover:scale-110 transition-all duration-300 cursor-pointer"><div data-v-aca1dd52="" data-v-ceeae103="" class="n-upload w-full h-full" max-size="0.0000095367431640625" style="--n-bezier: cubic-bezier(.4, 0, .2, 1); --n-border-radius: 3px; --n-dragger-border: 1px dashed rgba(255, 255, 255, 0.24); --n-dragger-border-hover: 1px dashed #0a84ff; --n-dragger-color: rgba(255, 255, 255, 0.06); --n-font-size: 14px; --n-item-color-hover: rgba(255, 255, 255, 0.09); --n-item-color-hover-error: rgba(232, 128, 128, 0.09); --n-item-disabled-opacity: 0.38; --n-item-icon-color: rgba(255, 255, 255, 0.38); --n-item-text-color: rgba(255, 255, 255, 0.82); --n-item-text-color-error: #e88080; --n-item-text-color-success: #63e2b7; --n-line-height: 1.6; --n-item-border-image-card-error: 1px solid #e88080; --n-item-border-image-card: 1px solid rgba(255, 255, 255, 0.24);"><input type="file" class="n-upload-file-input" accept="image/jpeg,image/png,image/gif,image/webp"><div class="n-upload-trigger"><div data-v-aca1dd52="" class="h-full"><div data-v-aca1dd52="" class="loading-mask absolute bg-[var(--chatfire_bg_hover)] rounded z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-full w-full flex items-center justify-center"><svg data-v-104cf9eb="" data-v-aca1dd52="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--line-md" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c4.97 0 9 4.03 9 9"><animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"></animateTransform></path></svg></div><div data-v-ceeae103="" class="w-full h-full rounded flex flex-col justify-center items-center" style="border: 2px dashed rgb(102, 99, 99);"><svg data-v-104cf9eb="" data-v-ceeae103="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--stash" width="20" height="20" viewBox="0 0 24 24" style="color: var(--chatfire_text_tertiary);"><path fill="currentColor" d="M12 5.25a.75.75 0 0 1 .75.75v5.25H18a.75.75 0 0 1 0 1.5h-5.25V18a.75.75 0 0 1-1.5 0v-5.25H6a.75.75 0 0 1 0-1.5h5.25V6a.75.75 0 0 1 .75-.75"></path></svg><span data-v-ceeae103="" class="text-[10px] text-center">上传</span><span data-v-ceeae103="" class="text-[10px] text-center">0 / 4</span></div></div></div><!----></div></div></div></div><!----></div><!----><div data-v-ff93ebb7="" class="w-6 h-6 absolute right-2 top-3"><!----><div data-v-ff93ebb7=""><svg data-v-104cf9eb="" data-v-ff93ebb7="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--humbleicons" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M15 19c1.2-3.678 2.526-5.005 6-6c-3.474-.995-4.8-2.322-6-6c-1.2 3.678-2.526 5.005-6 6c3.474.995 4.8 2.322 6 6Zm-8-9c.6-1.84 1.263-2.503 3-3c-1.737-.497-2.4-1.16-3-3c-.6 1.84-1.263 2.503-3 3c1.737.497 2.4 1.16 3 3Zm1.5 10c.3-.92.631-1.251 1.5-1.5c-.869-.249-1.2-.58-1.5-1.5c-.3.92-.631 1.251-1.5 1.5c.869.249 1.2.58 1.5 1.5Z"></path></svg><svg data-v-104cf9eb="" data-v-ff93ebb7="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--material-symbols" width="24" height="24" viewBox="0 0 24 24" style="display: none;"><path fill="currentColor" d="M6 16V8q0-.825.588-1.412T8 6h8q.825 0 1.413.588T18 8v8q0 .825-.587 1.413T16 18H8q-.825 0-1.412-.587T6 16m2 0h8V8H8zm4-4"></path></svg></div><!----></div><div data-v-ff93ebb7="" class="input-with-mention"><div data-v-ff93ebb7="" class="prompt-input-editable" contenteditable="true" data-placeholder="请输入图片生成的提示词，例如：做一张&quot;情人节&quot;海报"></div><!----></div></div><div data-v-ff93ebb7="" class="footer flex justify-between items-center"><div data-v-ff93ebb7="" class="action-buttons"><!----><div data-v-347f19ca="" class="model-select-button"><div data-v-347f19ca="" class="flex items-center"><svg data-v-104cf9eb="" data-v-347f19ca="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon mr-1 mr-1 iconify iconify--material-symbols" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm1-4h12l-3.75-5l-3 4L9 13z"></path></svg><span data-v-347f19ca="">图片</span><svg data-v-104cf9eb="" data-v-347f19ca="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon arrow ml-1 arrow ml-1 iconify iconify--material-symbols" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z"></path></svg></div></div><!----><!----><div data-v-6642ab2a="" class="model-select-button"><div data-v-6642ab2a="" class="flex items-center"><img data-v-6642ab2a="" src="https://ffile.chatfire.site/cf/chatfire-media/icon/dark/google-color.png" class="w-5 h-5 rounded shrink-0 mr-1"><span data-v-6642ab2a="">Nano-Banana-Pro</span><svg data-v-104cf9eb="" data-v-6642ab2a="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon arrow ml-1 arrow ml-1 iconify iconify--material-symbols" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z"></path></svg></div></div><!----><!----><!----><!----><div data-v-d36cb599="" class="illustration-button"><div data-v-d36cb599="" class="flex items-center"><svg data-v-104cf9eb="" data-v-d36cb599="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon m-1 m-1 iconify iconify--mdi" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M12 22A10 10 0 0 1 2 12A10 10 0 0 1 12 2c5.5 0 10 4 10 9a6 6 0 0 1-6 6h-1.8c-.3 0-.5.2-.5.5c0 .1.1.2.1.3c.4.5.6 1.1.6 1.7c.1 1.4-1 2.5-2.4 2.5m0-18a8 8 0 0 0-8 8a8 8 0 0 0 8 8c.3 0 .5-.2.5-.5c0-.2-.1-.3-.1-.4c-.4-.5-.6-1-.6-1.6c0-1.4 1.1-2.5 2.5-2.5H16a4 4 0 0 0 4-4c0-3.9-3.6-7-8-7m-5.5 6c.8 0 1.5.7 1.5 1.5S7.3 13 6.5 13S5 12.3 5 11.5S5.7 10 6.5 10m3-4c.8 0 1.5.7 1.5 1.5S10.3 9 9.5 9S8 8.3 8 7.5S8.7 6 9.5 6m5 0c.8 0 1.5.7 1.5 1.5S15.3 9 14.5 9S13 8.3 13 7.5S13.7 6 14.5 6m3 4c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5"></path></svg></div></div><!----><!----><!----><!----></div><div data-v-ff93ebb7="" class="footer-right"><!----><div data-v-3464ea82="" class="combined-config-button"><div data-v-3464ea82="" class="flex items-center"><span data-v-3464ea82="">1:1</span><svg data-v-104cf9eb="" data-v-3464ea82="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon arrow ml-1 arrow ml-1 iconify iconify--material-symbols" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z"></path></svg></div></div><!----><div data-v-ff93ebb7="" class="credit-cost-display"><svg data-v-104cf9eb="" data-v-ff93ebb7="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon credit-icon credit-icon iconify iconify--mdi" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M11 15H6l7-14v8h5l-7 14z"></path></svg><span data-v-ff93ebb7="" class="credit-text">40</span></div><div data-v-ff93ebb7="" class="submit-button"><svg data-v-104cf9eb="" data-v-ff93ebb7="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="svg-icon iconify iconify--iconamoon" width="20" height="20" viewBox="0 0 24 24" style="color: rgb(255, 255, 255);"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 12l-.604-5.437C4.223 5.007 5.825 3.864 7.24 4.535l11.944 5.658c1.525.722 1.525 2.892 0 3.614L7.24 19.466c-1.415.67-3.017-.472-2.844-2.028zm0 0h7"></path></svg></div></div></div></div></div><!----></div></div></main></div></div></div><div></div><!----><!----></div></div>
  

<!----><div class="v-binder-follower-container" style="z-index: 2000;"><div class="v-binder-follower-content" v-placement="top" style="--v-target-width: 38px; --v-target-height: 30px; --v-offset-left: 0px; --v-offset-top: 0px; transform: translateX(755px) translateY(428px) translateY(-100%) translateX(-50%); --v-transform-origin: bottom center; transform-origin: center bottom;"><!----></div></div><div id="v-binder-view-measurer" style="position: fixed; inset: 0px; pointer-events: none; visibility: hidden;"></div></body></html>