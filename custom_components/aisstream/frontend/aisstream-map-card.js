import{b as Ke,c as qe}from"./chunk-LIEGU7VX.js";var q=globalThis,Z=q.ShadowRoot&&(q.ShadyCSS===void 0||q.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,te=Symbol(),we=new WeakMap,H=class{constructor(s,e,t){if(this._$cssResult$=!0,t!==te)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=s,this.t=e}get styleSheet(){let s=this.o,e=this.t;if(Z&&s===void 0){let t=e!==void 0&&e.length===1;t&&(s=we.get(e)),s===void 0&&((this.o=s=new CSSStyleSheet).replaceSync(this.cssText),t&&we.set(e,s))}return s}toString(){return this.cssText}},y=n=>new H(typeof n=="string"?n:n+"",void 0,te),U=(n,...s)=>{let e=n.length===1?n[0]:s.reduce((t,i,o)=>t+(a=>{if(a._$cssResult$===!0)return a.cssText;if(typeof a=="number")return a;throw Error("Value passed to 'css' function must be a 'css' function result: "+a+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+n[o+1],n[0]);return new H(e,n,te)},ke=(n,s)=>{if(Z)n.adoptedStyleSheets=s.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of s){let t=document.createElement("style"),i=q.litNonce;i!==void 0&&t.setAttribute("nonce",i),t.textContent=e.cssText,n.appendChild(t)}},ie=Z?n=>n:n=>n instanceof CSSStyleSheet?(s=>{let e="";for(let t of s.cssRules)e+=t.cssText;return y(e)})(n):n;var{is:Ze,defineProperty:Ye,getOwnPropertyDescriptor:Je,getOwnPropertyNames:Qe,getOwnPropertySymbols:Xe,getPrototypeOf:et}=Object,Y=globalThis,$e=Y.trustedTypes,tt=$e?$e.emptyScript:"",it=Y.reactiveElementPolyfillSupport,N=(n,s)=>n,se={toAttribute(n,s){switch(s){case Boolean:n=n?tt:null;break;case Object:case Array:n=n==null?n:JSON.stringify(n)}return n},fromAttribute(n,s){let e=n;switch(s){case Boolean:e=n!==null;break;case Number:e=n===null?null:Number(n);break;case Object:case Array:try{e=JSON.parse(n)}catch{e=null}}return e}},Se=(n,s)=>!Ze(n,s),Ae={attribute:!0,type:String,converter:se,reflect:!1,useDefault:!1,hasChanged:Se};Symbol.metadata??=Symbol("metadata"),Y.litPropertyMetadata??=new WeakMap;var x=class extends HTMLElement{static addInitializer(s){this._$Ei(),(this.l??=[]).push(s)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(s,e=Ae){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(s)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(s,e),!e.noAccessor){let t=Symbol(),i=this.getPropertyDescriptor(s,t,e);i!==void 0&&Ye(this.prototype,s,i)}}static getPropertyDescriptor(s,e,t){let{get:i,set:o}=Je(this.prototype,s)??{get(){return this[e]},set(a){this[e]=a}};return{get:i,set(a){let l=i?.call(this);o?.call(this,a),this.requestUpdate(s,l,t)},configurable:!0,enumerable:!0}}static getPropertyOptions(s){return this.elementProperties.get(s)??Ae}static _$Ei(){if(this.hasOwnProperty(N("elementProperties")))return;let s=et(this);s.finalize(),s.l!==void 0&&(this.l=[...s.l]),this.elementProperties=new Map(s.elementProperties)}static finalize(){if(this.hasOwnProperty(N("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(N("properties"))){let e=this.properties,t=[...Qe(e),...Xe(e)];for(let i of t)this.createProperty(i,e[i])}let s=this[Symbol.metadata];if(s!==null){let e=litPropertyMetadata.get(s);if(e!==void 0)for(let[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(let[e,t]of this.elementProperties){let i=this._$Eu(e,t);i!==void 0&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(s){let e=[];if(Array.isArray(s)){let t=new Set(s.flat(1/0).reverse());for(let i of t)e.unshift(ie(i))}else s!==void 0&&e.push(ie(s));return e}static _$Eu(s,e){let t=e.attribute;return t===!1?void 0:typeof t=="string"?t:typeof s=="string"?s.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(s=>this.enableUpdating=s),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(s=>s(this))}addController(s){(this._$EO??=new Set).add(s),this.renderRoot!==void 0&&this.isConnected&&s.hostConnected?.()}removeController(s){this._$EO?.delete(s)}_$E_(){let s=new Map,e=this.constructor.elementProperties;for(let t of e.keys())this.hasOwnProperty(t)&&(s.set(t,this[t]),delete this[t]);s.size>0&&(this._$Ep=s)}createRenderRoot(){let s=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return ke(s,this.constructor.elementStyles),s}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(s=>s.hostConnected?.())}enableUpdating(s){}disconnectedCallback(){this._$EO?.forEach(s=>s.hostDisconnected?.())}attributeChangedCallback(s,e,t){this._$AK(s,t)}_$ET(s,e){let t=this.constructor.elementProperties.get(s),i=this.constructor._$Eu(s,t);if(i!==void 0&&t.reflect===!0){let o=(t.converter?.toAttribute!==void 0?t.converter:se).toAttribute(e,t.type);this._$Em=s,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(s,e){let t=this.constructor,i=t._$Eh.get(s);if(i!==void 0&&this._$Em!==i){let o=t.getPropertyOptions(i),a=typeof o.converter=="function"?{fromAttribute:o.converter}:o.converter?.fromAttribute!==void 0?o.converter:se;this._$Em=i;let l=a.fromAttribute(e,o.type);this[i]=l??this._$Ej?.get(i)??l,this._$Em=null}}requestUpdate(s,e,t,i=!1,o){if(s!==void 0){let a=this.constructor;if(i===!1&&(o=this[s]),t??=a.getPropertyOptions(s),!((t.hasChanged??Se)(o,e)||t.useDefault&&t.reflect&&o===this._$Ej?.get(s)&&!this.hasAttribute(a._$Eu(s,t))))return;this.C(s,e,t)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(s,e,{useDefault:t,reflect:i,wrapped:o},a){t&&!(this._$Ej??=new Map).has(s)&&(this._$Ej.set(s,a??e??this[s]),o!==!0||a!==void 0)||(this._$AL.has(s)||(this.hasUpdated||t||(e=void 0),this._$AL.set(s,e)),i===!0&&this._$Em!==s&&(this._$Eq??=new Set).add(s))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let s=this.scheduleUpdate();return s!=null&&await s,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,o]of this._$Ep)this[i]=o;this._$Ep=void 0}let t=this.constructor.elementProperties;if(t.size>0)for(let[i,o]of t){let{wrapped:a}=o,l=this[i];a!==!0||this._$AL.has(i)||l===void 0||this.C(i,void 0,o,l)}}let s=!1,e=this._$AL;try{s=this.shouldUpdate(e),s?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(t){throw s=!1,this._$EM(),t}s&&this._$AE(e)}willUpdate(s){}_$AE(s){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(s)),this.updated(s)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(s){return!0}update(s){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(s){}firstUpdated(s){}};x.elementStyles=[],x.shadowRootOptions={mode:"open"},x[N("elementProperties")]=new Map,x[N("finalized")]=new Map,it?.({ReactiveElement:x}),(Y.reactiveElementVersions??=[]).push("2.1.2");var pe=globalThis,Le=n=>n,J=pe.trustedTypes,Ee=J?J.createPolicy("lit-html",{createHTML:n=>n}):void 0,Pe="$lit$",$=`lit$${Math.random().toFixed(9).slice(2)}$`,Oe="?"+$,st=`<${Oe}>`,T=document,D=()=>T.createComment(""),B=n=>n===null||typeof n!="object"&&typeof n!="function",he=Array.isArray,ot=n=>he(n)||typeof n?.[Symbol.iterator]=="function",oe=`[ 	
\f\r]`,I=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Te=/-->/g,Ce=/>/g,L=RegExp(`>|${oe}(?:([^\\s"'>=/]+)(${oe}*=${oe}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Re=/'/g,Me=/"/g,He=/^(?:script|style|textarea|title)$/i,de=n=>(s,...e)=>({_$litType$:n,strings:s,values:e}),A=de(1),xt=de(2),wt=de(3),C=Symbol.for("lit-noChange"),u=Symbol.for("lit-nothing"),ze=new WeakMap,E=T.createTreeWalker(T,129);function Ue(n,s){if(!he(n)||!n.hasOwnProperty("raw"))throw Error("invalid template strings array");return Ee!==void 0?Ee.createHTML(s):s}var at=(n,s)=>{let e=n.length-1,t=[],i,o=s===2?"<svg>":s===3?"<math>":"",a=I;for(let l=0;l<e;l++){let r=n[l],c,p,h=-1,f=0;for(;f<r.length&&(a.lastIndex=f,p=a.exec(r),p!==null);)f=a.lastIndex,a===I?p[1]==="!--"?a=Te:p[1]!==void 0?a=Ce:p[2]!==void 0?(He.test(p[2])&&(i=RegExp("</"+p[2],"g")),a=L):p[3]!==void 0&&(a=L):a===L?p[0]===">"?(a=i??I,h=-1):p[1]===void 0?h=-2:(h=a.lastIndex-p[2].length,c=p[1],a=p[3]===void 0?L:p[3]==='"'?Me:Re):a===Me||a===Re?a=L:a===Te||a===Ce?a=I:(a=L,i=void 0);let m=a===L&&n[l+1].startsWith("/>")?" ":"";o+=a===I?r+st:h>=0?(t.push(c),r.slice(0,h)+Pe+r.slice(h)+$+m):r+$+(h===-2?l:m)}return[Ue(n,o+(n[e]||"<?>")+(s===2?"</svg>":s===3?"</math>":"")),t]},V=class n{constructor({strings:s,_$litType$:e},t){let i;this.parts=[];let o=0,a=0,l=s.length-1,r=this.parts,[c,p]=at(s,e);if(this.el=n.createElement(c,t),E.currentNode=this.el.content,e===2||e===3){let h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(i=E.nextNode())!==null&&r.length<l;){if(i.nodeType===1){if(i.hasAttributes())for(let h of i.getAttributeNames())if(h.endsWith(Pe)){let f=p[a++],m=i.getAttribute(h).split($),g=/([.?@])?(.*)/.exec(f);r.push({type:1,index:o,name:g[2],strings:m,ctor:g[1]==="."?re:g[1]==="?"?ne:g[1]==="@"?le:z}),i.removeAttribute(h)}else h.startsWith($)&&(r.push({type:6,index:o}),i.removeAttribute(h));if(He.test(i.tagName)){let h=i.textContent.split($),f=h.length-1;if(f>0){i.textContent=J?J.emptyScript:"";for(let m=0;m<f;m++)i.append(h[m],D()),E.nextNode(),r.push({type:2,index:++o});i.append(h[f],D())}}}else if(i.nodeType===8)if(i.data===Oe)r.push({type:2,index:o});else{let h=-1;for(;(h=i.data.indexOf($,h+1))!==-1;)r.push({type:7,index:o}),h+=$.length-1}o++}}static createElement(s,e){let t=T.createElement("template");return t.innerHTML=s,t}};function M(n,s,e=n,t){if(s===C)return s;let i=t!==void 0?e._$Co?.[t]:e._$Cl,o=B(s)?void 0:s._$litDirective$;return i?.constructor!==o&&(i?._$AO?.(!1),o===void 0?i=void 0:(i=new o(n),i._$AT(n,e,t)),t!==void 0?(e._$Co??=[])[t]=i:e._$Cl=i),i!==void 0&&(s=M(n,i._$AS(n,s.values),i,t)),s}var ae=class{constructor(s,e){this._$AV=[],this._$AN=void 0,this._$AD=s,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(s){let{el:{content:e},parts:t}=this._$AD,i=(s?.creationScope??T).importNode(e,!0);E.currentNode=i;let o=E.nextNode(),a=0,l=0,r=t[0];for(;r!==void 0;){if(a===r.index){let c;r.type===2?c=new F(o,o.nextSibling,this,s):r.type===1?c=new r.ctor(o,r.name,r.strings,this,s):r.type===6&&(c=new ce(o,this,s)),this._$AV.push(c),r=t[++l]}a!==r?.index&&(o=E.nextNode(),a++)}return E.currentNode=T,i}p(s){let e=0;for(let t of this._$AV)t!==void 0&&(t.strings!==void 0?(t._$AI(s,t,e),e+=t.strings.length-2):t._$AI(s[e])),e++}},F=class n{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(s,e,t,i){this.type=2,this._$AH=u,this._$AN=void 0,this._$AA=s,this._$AB=e,this._$AM=t,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let s=this._$AA.parentNode,e=this._$AM;return e!==void 0&&s?.nodeType===11&&(s=e.parentNode),s}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(s,e=this){s=M(this,s,e),B(s)?s===u||s==null||s===""?(this._$AH!==u&&this._$AR(),this._$AH=u):s!==this._$AH&&s!==C&&this._(s):s._$litType$!==void 0?this.$(s):s.nodeType!==void 0?this.T(s):ot(s)?this.k(s):this._(s)}O(s){return this._$AA.parentNode.insertBefore(s,this._$AB)}T(s){this._$AH!==s&&(this._$AR(),this._$AH=this.O(s))}_(s){this._$AH!==u&&B(this._$AH)?this._$AA.nextSibling.data=s:this.T(T.createTextNode(s)),this._$AH=s}$(s){let{values:e,_$litType$:t}=s,i=typeof t=="number"?this._$AC(s):(t.el===void 0&&(t.el=V.createElement(Ue(t.h,t.h[0]),this.options)),t);if(this._$AH?._$AD===i)this._$AH.p(e);else{let o=new ae(i,this),a=o.u(this.options);o.p(e),this.T(a),this._$AH=o}}_$AC(s){let e=ze.get(s.strings);return e===void 0&&ze.set(s.strings,e=new V(s)),e}k(s){he(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,t,i=0;for(let o of s)i===e.length?e.push(t=new n(this.O(D()),this.O(D()),this,this.options)):t=e[i],t._$AI(o),i++;i<e.length&&(this._$AR(t&&t._$AB.nextSibling,i),e.length=i)}_$AR(s=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);s!==this._$AB;){let t=Le(s).nextSibling;Le(s).remove(),s=t}}setConnected(s){this._$AM===void 0&&(this._$Cv=s,this._$AP?.(s))}},z=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(s,e,t,i,o){this.type=1,this._$AH=u,this._$AN=void 0,this.element=s,this.name=e,this._$AM=i,this.options=o,t.length>2||t[0]!==""||t[1]!==""?(this._$AH=Array(t.length-1).fill(new String),this.strings=t):this._$AH=u}_$AI(s,e=this,t,i){let o=this.strings,a=!1;if(o===void 0)s=M(this,s,e,0),a=!B(s)||s!==this._$AH&&s!==C,a&&(this._$AH=s);else{let l=s,r,c;for(s=o[0],r=0;r<o.length-1;r++)c=M(this,l[t+r],e,r),c===C&&(c=this._$AH[r]),a||=!B(c)||c!==this._$AH[r],c===u?s=u:s!==u&&(s+=(c??"")+o[r+1]),this._$AH[r]=c}a&&!i&&this.j(s)}j(s){s===u?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,s??"")}},re=class extends z{constructor(){super(...arguments),this.type=3}j(s){this.element[this.name]=s===u?void 0:s}},ne=class extends z{constructor(){super(...arguments),this.type=4}j(s){this.element.toggleAttribute(this.name,!!s&&s!==u)}},le=class extends z{constructor(s,e,t,i,o){super(s,e,t,i,o),this.type=5}_$AI(s,e=this){if((s=M(this,s,e,0)??u)===C)return;let t=this._$AH,i=s===u&&t!==u||s.capture!==t.capture||s.once!==t.once||s.passive!==t.passive,o=s!==u&&(t===u||i);i&&this.element.removeEventListener(this.name,this,t),o&&this.element.addEventListener(this.name,this,s),this._$AH=s}handleEvent(s){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,s):this._$AH.handleEvent(s)}},ce=class{constructor(s,e,t){this.element=s,this.type=6,this._$AN=void 0,this._$AM=e,this.options=t}get _$AU(){return this._$AM._$AU}_$AI(s){M(this,s)}};var rt=pe.litHtmlPolyfillSupport;rt?.(V,F),(pe.litHtmlVersions??=[]).push("3.3.3");var Ne=(n,s,e)=>{let t=e?.renderBefore??s,i=t._$litPart$;if(i===void 0){let o=e?.renderBefore??null;t._$litPart$=i=new F(s.insertBefore(D(),o),o,void 0,e??{})}return i._$AI(n),i};var ue=globalThis,v=class extends x{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let s=super.createRenderRoot();return this.renderOptions.renderBefore??=s.firstChild,s}update(s){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(s),this._$Do=Ne(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return C}};v._$litElement$=!0,v.finalized=!0,ue.litElementHydrateSupport?.({LitElement:v});var nt=ue.litElementPolyfillSupport;nt?.({LitElement:v});(ue.litElementVersions??=[]).push("4.2.2");var d=Ke(qe(),1);var Ie=`/* required styles */\r
\r
.leaflet-pane,\r
.leaflet-tile,\r
.leaflet-marker-icon,\r
.leaflet-marker-shadow,\r
.leaflet-tile-container,\r
.leaflet-pane > svg,\r
.leaflet-pane > canvas,\r
.leaflet-zoom-box,\r
.leaflet-image-layer,\r
.leaflet-layer {\r
	position: absolute;\r
	left: 0;\r
	top: 0;\r
	}\r
.leaflet-container {\r
	overflow: hidden;\r
	}\r
.leaflet-tile,\r
.leaflet-marker-icon,\r
.leaflet-marker-shadow {\r
	-webkit-user-select: none;\r
	   -moz-user-select: none;\r
	        user-select: none;\r
	  -webkit-user-drag: none;\r
	}\r
/* Prevents IE11 from highlighting tiles in blue */\r
.leaflet-tile::selection {\r
	background: transparent;\r
}\r
/* Safari renders non-retina tile on retina better with this, but Chrome is worse */\r
.leaflet-safari .leaflet-tile {\r
	image-rendering: -webkit-optimize-contrast;\r
	}\r
/* hack that prevents hw layers "stretching" when loading new tiles */\r
.leaflet-safari .leaflet-tile-container {\r
	width: 1600px;\r
	height: 1600px;\r
	-webkit-transform-origin: 0 0;\r
	}\r
.leaflet-marker-icon,\r
.leaflet-marker-shadow {\r
	display: block;\r
	}\r
/* .leaflet-container svg: reset svg max-width decleration shipped in Joomla! (joomla.org) 3.x */\r
/* .leaflet-container img: map is broken in FF if you have max-width: 100% on tiles */\r
.leaflet-container .leaflet-overlay-pane svg {\r
	max-width: none !important;\r
	max-height: none !important;\r
	}\r
.leaflet-container .leaflet-marker-pane img,\r
.leaflet-container .leaflet-shadow-pane img,\r
.leaflet-container .leaflet-tile-pane img,\r
.leaflet-container img.leaflet-image-layer,\r
.leaflet-container .leaflet-tile {\r
	max-width: none !important;\r
	max-height: none !important;\r
	width: auto;\r
	padding: 0;\r
	}\r
\r
.leaflet-container img.leaflet-tile {\r
	/* See: https://bugs.chromium.org/p/chromium/issues/detail?id=600120 */\r
	mix-blend-mode: plus-lighter;\r
}\r
\r
.leaflet-container.leaflet-touch-zoom {\r
	-ms-touch-action: pan-x pan-y;\r
	touch-action: pan-x pan-y;\r
	}\r
.leaflet-container.leaflet-touch-drag {\r
	-ms-touch-action: pinch-zoom;\r
	/* Fallback for FF which doesn't support pinch-zoom */\r
	touch-action: none;\r
	touch-action: pinch-zoom;\r
}\r
.leaflet-container.leaflet-touch-drag.leaflet-touch-zoom {\r
	-ms-touch-action: none;\r
	touch-action: none;\r
}\r
.leaflet-container {\r
	-webkit-tap-highlight-color: transparent;\r
}\r
.leaflet-container a {\r
	-webkit-tap-highlight-color: rgba(51, 181, 229, 0.4);\r
}\r
.leaflet-tile {\r
	filter: inherit;\r
	visibility: hidden;\r
	}\r
.leaflet-tile-loaded {\r
	visibility: inherit;\r
	}\r
.leaflet-zoom-box {\r
	width: 0;\r
	height: 0;\r
	-moz-box-sizing: border-box;\r
	     box-sizing: border-box;\r
	z-index: 800;\r
	}\r
/* workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=888319 */\r
.leaflet-overlay-pane svg {\r
	-moz-user-select: none;\r
	}\r
\r
.leaflet-pane         { z-index: 400; }\r
\r
.leaflet-tile-pane    { z-index: 200; }\r
.leaflet-overlay-pane { z-index: 400; }\r
.leaflet-shadow-pane  { z-index: 500; }\r
.leaflet-marker-pane  { z-index: 600; }\r
.leaflet-tooltip-pane   { z-index: 650; }\r
.leaflet-popup-pane   { z-index: 700; }\r
\r
.leaflet-map-pane canvas { z-index: 100; }\r
.leaflet-map-pane svg    { z-index: 200; }\r
\r
.leaflet-vml-shape {\r
	width: 1px;\r
	height: 1px;\r
	}\r
.lvml {\r
	behavior: url(#default#VML);\r
	display: inline-block;\r
	position: absolute;\r
	}\r
\r
\r
/* control positioning */\r
\r
.leaflet-control {\r
	position: relative;\r
	z-index: 800;\r
	pointer-events: visiblePainted; /* IE 9-10 doesn't have auto */\r
	pointer-events: auto;\r
	}\r
.leaflet-top,\r
.leaflet-bottom {\r
	position: absolute;\r
	z-index: 1000;\r
	pointer-events: none;\r
	}\r
.leaflet-top {\r
	top: 0;\r
	}\r
.leaflet-right {\r
	right: 0;\r
	}\r
.leaflet-bottom {\r
	bottom: 0;\r
	}\r
.leaflet-left {\r
	left: 0;\r
	}\r
.leaflet-control {\r
	float: left;\r
	clear: both;\r
	}\r
.leaflet-right .leaflet-control {\r
	float: right;\r
	}\r
.leaflet-top .leaflet-control {\r
	margin-top: 10px;\r
	}\r
.leaflet-bottom .leaflet-control {\r
	margin-bottom: 10px;\r
	}\r
.leaflet-left .leaflet-control {\r
	margin-left: 10px;\r
	}\r
.leaflet-right .leaflet-control {\r
	margin-right: 10px;\r
	}\r
\r
\r
/* zoom and fade animations */\r
\r
.leaflet-fade-anim .leaflet-popup {\r
	opacity: 0;\r
	-webkit-transition: opacity 0.2s linear;\r
	   -moz-transition: opacity 0.2s linear;\r
	        transition: opacity 0.2s linear;\r
	}\r
.leaflet-fade-anim .leaflet-map-pane .leaflet-popup {\r
	opacity: 1;\r
	}\r
.leaflet-zoom-animated {\r
	-webkit-transform-origin: 0 0;\r
	    -ms-transform-origin: 0 0;\r
	        transform-origin: 0 0;\r
	}\r
svg.leaflet-zoom-animated {\r
	will-change: transform;\r
}\r
\r
.leaflet-zoom-anim .leaflet-zoom-animated {\r
	-webkit-transition: -webkit-transform 0.25s cubic-bezier(0,0,0.25,1);\r
	   -moz-transition:    -moz-transform 0.25s cubic-bezier(0,0,0.25,1);\r
	        transition:         transform 0.25s cubic-bezier(0,0,0.25,1);\r
	}\r
.leaflet-zoom-anim .leaflet-tile,\r
.leaflet-pan-anim .leaflet-tile {\r
	-webkit-transition: none;\r
	   -moz-transition: none;\r
	        transition: none;\r
	}\r
\r
.leaflet-zoom-anim .leaflet-zoom-hide {\r
	visibility: hidden;\r
	}\r
\r
\r
/* cursors */\r
\r
.leaflet-interactive {\r
	cursor: pointer;\r
	}\r
.leaflet-grab {\r
	cursor: -webkit-grab;\r
	cursor:    -moz-grab;\r
	cursor:         grab;\r
	}\r
.leaflet-crosshair,\r
.leaflet-crosshair .leaflet-interactive {\r
	cursor: crosshair;\r
	}\r
.leaflet-popup-pane,\r
.leaflet-control {\r
	cursor: auto;\r
	}\r
.leaflet-dragging .leaflet-grab,\r
.leaflet-dragging .leaflet-grab .leaflet-interactive,\r
.leaflet-dragging .leaflet-marker-draggable {\r
	cursor: move;\r
	cursor: -webkit-grabbing;\r
	cursor:    -moz-grabbing;\r
	cursor:         grabbing;\r
	}\r
\r
/* marker & overlays interactivity */\r
.leaflet-marker-icon,\r
.leaflet-marker-shadow,\r
.leaflet-image-layer,\r
.leaflet-pane > svg path,\r
.leaflet-tile-container {\r
	pointer-events: none;\r
	}\r
\r
.leaflet-marker-icon.leaflet-interactive,\r
.leaflet-image-layer.leaflet-interactive,\r
.leaflet-pane > svg path.leaflet-interactive,\r
svg.leaflet-image-layer.leaflet-interactive path {\r
	pointer-events: visiblePainted; /* IE 9-10 doesn't have auto */\r
	pointer-events: auto;\r
	}\r
\r
/* visual tweaks */\r
\r
.leaflet-container {\r
	background: #ddd;\r
	outline-offset: 1px;\r
	}\r
.leaflet-container a {\r
	color: #0078A8;\r
	}\r
.leaflet-zoom-box {\r
	border: 2px dotted #38f;\r
	background: rgba(255,255,255,0.5);\r
	}\r
\r
\r
/* general typography */\r
.leaflet-container {\r
	font-family: "Helvetica Neue", Arial, Helvetica, sans-serif;\r
	font-size: 12px;\r
	font-size: 0.75rem;\r
	line-height: 1.5;\r
	}\r
\r
\r
/* general toolbar styles */\r
\r
.leaflet-bar {\r
	box-shadow: 0 1px 5px rgba(0,0,0,0.65);\r
	border-radius: 4px;\r
	}\r
.leaflet-bar a {\r
	background-color: #fff;\r
	border-bottom: 1px solid #ccc;\r
	width: 26px;\r
	height: 26px;\r
	line-height: 26px;\r
	display: block;\r
	text-align: center;\r
	text-decoration: none;\r
	color: black;\r
	}\r
.leaflet-bar a,\r
.leaflet-control-layers-toggle {\r
	background-position: 50% 50%;\r
	background-repeat: no-repeat;\r
	display: block;\r
	}\r
.leaflet-bar a:hover,\r
.leaflet-bar a:focus {\r
	background-color: #f4f4f4;\r
	}\r
.leaflet-bar a:first-child {\r
	border-top-left-radius: 4px;\r
	border-top-right-radius: 4px;\r
	}\r
.leaflet-bar a:last-child {\r
	border-bottom-left-radius: 4px;\r
	border-bottom-right-radius: 4px;\r
	border-bottom: none;\r
	}\r
.leaflet-bar a.leaflet-disabled {\r
	cursor: default;\r
	background-color: #f4f4f4;\r
	color: #bbb;\r
	}\r
\r
.leaflet-touch .leaflet-bar a {\r
	width: 30px;\r
	height: 30px;\r
	line-height: 30px;\r
	}\r
.leaflet-touch .leaflet-bar a:first-child {\r
	border-top-left-radius: 2px;\r
	border-top-right-radius: 2px;\r
	}\r
.leaflet-touch .leaflet-bar a:last-child {\r
	border-bottom-left-radius: 2px;\r
	border-bottom-right-radius: 2px;\r
	}\r
\r
/* zoom control */\r
\r
.leaflet-control-zoom-in,\r
.leaflet-control-zoom-out {\r
	font: bold 18px 'Lucida Console', Monaco, monospace;\r
	text-indent: 1px;\r
	}\r
\r
.leaflet-touch .leaflet-control-zoom-in, .leaflet-touch .leaflet-control-zoom-out  {\r
	font-size: 22px;\r
	}\r
\r
\r
/* layers control */\r
\r
.leaflet-control-layers {\r
	box-shadow: 0 1px 5px rgba(0,0,0,0.4);\r
	background: #fff;\r
	border-radius: 5px;\r
	}\r
.leaflet-control-layers-toggle {\r
	background-image: url(images/layers.png);\r
	width: 36px;\r
	height: 36px;\r
	}\r
.leaflet-retina .leaflet-control-layers-toggle {\r
	background-image: url(images/layers-2x.png);\r
	background-size: 26px 26px;\r
	}\r
.leaflet-touch .leaflet-control-layers-toggle {\r
	width: 44px;\r
	height: 44px;\r
	}\r
.leaflet-control-layers .leaflet-control-layers-list,\r
.leaflet-control-layers-expanded .leaflet-control-layers-toggle {\r
	display: none;\r
	}\r
.leaflet-control-layers-expanded .leaflet-control-layers-list {\r
	display: block;\r
	position: relative;\r
	}\r
.leaflet-control-layers-expanded {\r
	padding: 6px 10px 6px 6px;\r
	color: #333;\r
	background: #fff;\r
	}\r
.leaflet-control-layers-scrollbar {\r
	overflow-y: scroll;\r
	overflow-x: hidden;\r
	padding-right: 5px;\r
	}\r
.leaflet-control-layers-selector {\r
	margin-top: 2px;\r
	position: relative;\r
	top: 1px;\r
	}\r
.leaflet-control-layers label {\r
	display: block;\r
	font-size: 13px;\r
	font-size: 1.08333em;\r
	}\r
.leaflet-control-layers-separator {\r
	height: 0;\r
	border-top: 1px solid #ddd;\r
	margin: 5px -10px 5px -6px;\r
	}\r
\r
/* Default icon URLs */\r
.leaflet-default-icon-path { /* used only in path-guessing heuristic, see L.Icon.Default */\r
	background-image: url(images/marker-icon.png);\r
	}\r
\r
\r
/* attribution and scale controls */\r
\r
.leaflet-container .leaflet-control-attribution {\r
	background: #fff;\r
	background: rgba(255, 255, 255, 0.8);\r
	margin: 0;\r
	}\r
.leaflet-control-attribution,\r
.leaflet-control-scale-line {\r
	padding: 0 5px;\r
	color: #333;\r
	line-height: 1.4;\r
	}\r
.leaflet-control-attribution a {\r
	text-decoration: none;\r
	}\r
.leaflet-control-attribution a:hover,\r
.leaflet-control-attribution a:focus {\r
	text-decoration: underline;\r
	}\r
.leaflet-attribution-flag {\r
	display: inline !important;\r
	vertical-align: baseline !important;\r
	width: 1em;\r
	height: 0.6669em;\r
	}\r
.leaflet-left .leaflet-control-scale {\r
	margin-left: 5px;\r
	}\r
.leaflet-bottom .leaflet-control-scale {\r
	margin-bottom: 5px;\r
	}\r
.leaflet-control-scale-line {\r
	border: 2px solid #777;\r
	border-top: none;\r
	line-height: 1.1;\r
	padding: 2px 5px 1px;\r
	white-space: nowrap;\r
	-moz-box-sizing: border-box;\r
	     box-sizing: border-box;\r
	background: rgba(255, 255, 255, 0.8);\r
	text-shadow: 1px 1px #fff;\r
	}\r
.leaflet-control-scale-line:not(:first-child) {\r
	border-top: 2px solid #777;\r
	border-bottom: none;\r
	margin-top: -2px;\r
	}\r
.leaflet-control-scale-line:not(:first-child):not(:last-child) {\r
	border-bottom: 2px solid #777;\r
	}\r
\r
.leaflet-touch .leaflet-control-attribution,\r
.leaflet-touch .leaflet-control-layers,\r
.leaflet-touch .leaflet-bar {\r
	box-shadow: none;\r
	}\r
.leaflet-touch .leaflet-control-layers,\r
.leaflet-touch .leaflet-bar {\r
	border: 2px solid rgba(0,0,0,0.2);\r
	background-clip: padding-box;\r
	}\r
\r
\r
/* popup */\r
\r
.leaflet-popup {\r
	position: absolute;\r
	text-align: center;\r
	margin-bottom: 20px;\r
	}\r
.leaflet-popup-content-wrapper {\r
	padding: 1px;\r
	text-align: left;\r
	border-radius: 12px;\r
	}\r
.leaflet-popup-content {\r
	margin: 13px 24px 13px 20px;\r
	line-height: 1.3;\r
	font-size: 13px;\r
	font-size: 1.08333em;\r
	min-height: 1px;\r
	}\r
.leaflet-popup-content p {\r
	margin: 17px 0;\r
	margin: 1.3em 0;\r
	}\r
.leaflet-popup-tip-container {\r
	width: 40px;\r
	height: 20px;\r
	position: absolute;\r
	left: 50%;\r
	margin-top: -1px;\r
	margin-left: -20px;\r
	overflow: hidden;\r
	pointer-events: none;\r
	}\r
.leaflet-popup-tip {\r
	width: 17px;\r
	height: 17px;\r
	padding: 1px;\r
\r
	margin: -10px auto 0;\r
	pointer-events: auto;\r
\r
	-webkit-transform: rotate(45deg);\r
	   -moz-transform: rotate(45deg);\r
	    -ms-transform: rotate(45deg);\r
	        transform: rotate(45deg);\r
	}\r
.leaflet-popup-content-wrapper,\r
.leaflet-popup-tip {\r
	background: white;\r
	color: #333;\r
	box-shadow: 0 3px 14px rgba(0,0,0,0.4);\r
	}\r
.leaflet-container a.leaflet-popup-close-button {\r
	position: absolute;\r
	top: 0;\r
	right: 0;\r
	border: none;\r
	text-align: center;\r
	width: 24px;\r
	height: 24px;\r
	font: 16px/24px Tahoma, Verdana, sans-serif;\r
	color: #757575;\r
	text-decoration: none;\r
	background: transparent;\r
	}\r
.leaflet-container a.leaflet-popup-close-button:hover,\r
.leaflet-container a.leaflet-popup-close-button:focus {\r
	color: #585858;\r
	}\r
.leaflet-popup-scrolled {\r
	overflow: auto;\r
	}\r
\r
.leaflet-oldie .leaflet-popup-content-wrapper {\r
	-ms-zoom: 1;\r
	}\r
.leaflet-oldie .leaflet-popup-tip {\r
	width: 24px;\r
	margin: 0 auto;\r
\r
	-ms-filter: "progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)";\r
	filter: progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678);\r
	}\r
\r
.leaflet-oldie .leaflet-control-zoom,\r
.leaflet-oldie .leaflet-control-layers,\r
.leaflet-oldie .leaflet-popup-content-wrapper,\r
.leaflet-oldie .leaflet-popup-tip {\r
	border: 1px solid #999;\r
	}\r
\r
\r
/* div icon */\r
\r
.leaflet-div-icon {\r
	background: #fff;\r
	border: 1px solid #666;\r
	}\r
\r
\r
/* Tooltip */\r
/* Base styles for the element that has a tooltip */\r
.leaflet-tooltip {\r
	position: absolute;\r
	padding: 6px;\r
	background-color: #fff;\r
	border: 1px solid #fff;\r
	border-radius: 3px;\r
	color: #222;\r
	white-space: nowrap;\r
	-webkit-user-select: none;\r
	-moz-user-select: none;\r
	-ms-user-select: none;\r
	user-select: none;\r
	pointer-events: none;\r
	box-shadow: 0 1px 3px rgba(0,0,0,0.4);\r
	}\r
.leaflet-tooltip.leaflet-interactive {\r
	cursor: pointer;\r
	pointer-events: auto;\r
	}\r
.leaflet-tooltip-top:before,\r
.leaflet-tooltip-bottom:before,\r
.leaflet-tooltip-left:before,\r
.leaflet-tooltip-right:before {\r
	position: absolute;\r
	pointer-events: none;\r
	border: 6px solid transparent;\r
	background: transparent;\r
	content: "";\r
	}\r
\r
/* Directions */\r
\r
.leaflet-tooltip-bottom {\r
	margin-top: 6px;\r
}\r
.leaflet-tooltip-top {\r
	margin-top: -6px;\r
}\r
.leaflet-tooltip-bottom:before,\r
.leaflet-tooltip-top:before {\r
	left: 50%;\r
	margin-left: -6px;\r
	}\r
.leaflet-tooltip-top:before {\r
	bottom: 0;\r
	margin-bottom: -12px;\r
	border-top-color: #fff;\r
	}\r
.leaflet-tooltip-bottom:before {\r
	top: 0;\r
	margin-top: -12px;\r
	margin-left: -6px;\r
	border-bottom-color: #fff;\r
	}\r
.leaflet-tooltip-left {\r
	margin-left: -6px;\r
}\r
.leaflet-tooltip-right {\r
	margin-left: 6px;\r
}\r
.leaflet-tooltip-left:before,\r
.leaflet-tooltip-right:before {\r
	top: 50%;\r
	margin-top: -6px;\r
	}\r
.leaflet-tooltip-left:before {\r
	right: 0;\r
	margin-right: -12px;\r
	border-left-color: #fff;\r
	}\r
.leaflet-tooltip-right:before {\r
	left: 0;\r
	margin-left: -12px;\r
	border-right-color: #fff;\r
	}\r
\r
/* Printing */\r
\r
@media print {\r
	/* Prevent printers from removing background-images of controls. */\r
	.leaflet-control {\r
		-webkit-print-color-adjust: exact;\r
		print-color-adjust: exact;\r
		}\r
	}\r
`;var Q={base:"simple",map_labels:!0,seamarks:!0,show_tracks:!0,hide_stationary:!1,show_favorites:!0,show_names:!1,track_minutes:5,stale_minutes:10,moving_stale_minutes:20,fit:"region"},ct=[{name:"title",selector:{text:{}}},{name:"entry_id",selector:{config_entry:{integration:"aisstream"}}},{type:"grid",name:"",schema:[{name:"base",required:!0,selector:{select:{mode:"dropdown",options:[{value:"simple",label:"Simple (follows theme)"},{value:"simple-light",label:"Simple, light"},{value:"simple-dark",label:"Simple, dark"},{value:"osm",label:"OpenStreetMap (detailed)"}]}}},{name:"fit",required:!0,selector:{select:{mode:"dropdown",options:[{value:"region",label:"Whole region"},{value:"vessels",label:"Visible vessels"}]}}}]},{type:"grid",name:"",schema:[{name:"seamarks",selector:{boolean:{}}},{name:"map_labels",selector:{boolean:{}}},{name:"show_tracks",selector:{boolean:{}}},{name:"show_names",selector:{boolean:{}}},{name:"hide_stationary",selector:{boolean:{}}},{name:"show_favorites",selector:{boolean:{}}}]},{type:"grid",name:"",schema:[{name:"track_minutes",selector:{number:{min:1,max:1440,mode:"box",unit_of_measurement:"min"}}},{name:"stale_minutes",selector:{number:{min:1,max:1440,mode:"box",unit_of_measurement:"min"}}},{name:"moving_stale_minutes",selector:{number:{min:1,max:1440,mode:"box",unit_of_measurement:"min"}}}]},{type:"expandable",name:"",flatten:!0,title:"Layout and custom map",schema:[{type:"grid",name:"",schema:[{name:"height",selector:{text:{}}},{name:"aspect_ratio",selector:{text:{}}}]},{name:"tile_url",selector:{text:{}}},{name:"tile_attribution",selector:{text:{}}}]}],pt={title:"Title",entry_id:"Region",base:"Base map",fit:"Initial view",seamarks:"Seamarks (OpenSeaMap)",map_labels:"Place names",show_tracks:"Show tracks",hide_stationary:"Hide stopped vessels",show_favorites:"Always show favorites",track_minutes:"Track length",stale_minutes:"Hide after not heard for",moving_stale_minutes:"Hide moving vessels after not heard for",show_names:"Vessel names",height:"Height (e.g. 450px)",aspect_ratio:"Aspect ratio (e.g. 16:9)",tile_url:"Custom tile URL",tile_attribution:"Custom tile attribution"},ht={entry_id:"Leave empty if you have a single region",map_labels:"Simple base map only",hide_stationary:"Initial state of the on-map toggle",show_favorites:"Even when filtered out, stopped or not heard recently",stale_minutes:"Favorites stay on the map, faded",moving_stale_minutes:"Last speed over 1 kn: reception gaps are common under way",show_names:"Hidden where they would overlap; zoom in to see more",track_minutes:"Up to 1440 min (24 h)",tile_url:"Replaces the base map, e.g. https://tile.example.com/{z}/{x}/{y}.png"};async function dt(){if(!customElements.get("ha-form")){try{await(await(await window.loadCardHelpers?.())?.createCardElement({type:"entities",entities:[]}))?.constructor?.getConfigElement?.()}catch{}await customElements.whenDefined("ha-form")}}var j=class extends v{constructor(){super(...arguments);this._ready=!1}setConfig(e){this._config=e}connectedCallback(){super.connectedCallback(),dt().then(()=>this._ready=!0)}render(){if(!this._config||!this._ready)return u;let e={...Q,...this._config};return A`<ha-form
      .hass=${this.hass}
      .data=${e}
      .schema=${ct}
      .computeLabel=${t=>pt[t.name]??t.name}
      .computeHelper=${t=>ht[t.name]}
      @value-changed=${this._changed}
    ></ha-form>
    <p class="hint">Click a category on the map to hide it; double-click to show only that category.</p>`}_changed(e){e.stopPropagation();let t={...e.detail.value},i=this._config??{};for(let[o,a]of Object.entries(t)){let l=Q[o]===a&&!(o in i);(a===""||a===void 0||a===null||l)&&delete t[o]}this._config=t,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:t},bubbles:!0,composed:!0}))}};j.properties={hass:{attribute:!1},_config:{state:!0},_ready:{state:!0}},j.styles=U`
    .hint {
      color: var(--secondary-text-color);
      font-size: 12px;
      margin: 12px 0 0;
    }
  `;customElements.get("aisstream-map-card-editor")||customElements.define("aisstream-map-card-editor",j);var S={cargo:"#2e9e44",tanker:"#d43a3a",passenger:"#2f6fd6",high_speed:"#e3b505",special:"#13a3b5",fishing:"#f07f22",sailing:"#8e44ad",pleasure:"#d1489f",other:"#78909c",unknown:"#a0a0a0"},X={cargo:"Cargo",tanker:"Tanker",passenger:"Passenger",high_speed:"High speed",special:"Tug / pilot / SAR",fishing:"Fishing",sailing:"Sailing",pleasure:"Pleasure",other:"Other",unknown:"Unknown"},De={0:"Under way (engine)",1:"At anchor",2:"Not under command",3:"Restricted manoeuvrability",4:"Constrained by draught",5:"Moored",6:"Aground",7:"Fishing",8:"Under way (sailing)",14:"AIS-SART"},Be={underway:"Under way",sailing:"Under way (sailing)",at_anchor:"At anchor",moored:"Moored",aground:"Aground",fishing:"Fishing",not_under_command:"Not under command",restricted_manoeuvrability:"Restricted manoeuvrability",constrained_by_draught:"Constrained by draught",emergency:"Emergency (AIS-SART)",stopped:"Stopped",out_of_range:"Out of range"},w="#ffc107",ut='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',fe={osm:{url:"/api/map_tiles/raster/{z}/{x}/{y}.png",attribution:ut,maxZoom:19}},ee={url:"https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",attribution:'Seamarks &copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors',maxZoom:18};function P(n){return String(n??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Ve(n){return n<60?"just now":n<3600?`${Math.round(n/60)} min ago`:n<86400?`${Math.round(n/3600)} h ago`:`${Math.round(n/86400)} d ago`}var Fe="0.1.9";var O=3600,me=[[1/3,.9],[2/3,.55],[1/0,.25]],ge=5,_e=[["6h",6*O],["24h",24*O],["7d",7*24*O],["30d",30*24*O],["1y",365*24*O],["All",null]],je="600 11px Roboto, 'Noto Sans', sans-serif",be=10,G=14,mt=1,gt=600,W=class extends v{constructor(){super(...arguments);this._status="loading";this._error="";this._hidden=new Set;this._hideStopped=!1;this._counts={};this._shown=0;this._simpleFailed=!1;this._maplibreCssAdded=!1;this._vessels=new Map;this._favorites=new Map;this._skew=0;this._connecting=!1;this._connGen=0;this._redrawQueued=!1;this._fitted=!1;this._historyGen=0}static getStubConfig(){return{}}static getConfigElement(){return document.createElement("aisstream-map-card-editor")}setConfig(e){if(e.track_minutes!==void 0&&(e.track_minutes<=0||e.track_minutes>1440))throw new Error("track_minutes must be between 1 and 1440 (24 h; longer history: favorites, from the popup)");let t=this._config?this._windowHours():void 0,i=this._config&&this._config.entry_id!==e.entry_id;(!this._config||this._config.hide_stationary!==e.hide_stationary)&&(this._hideStopped=!!e.hide_stationary),this._config={...Q,track_minutes:ge,...e},this._map&&(this._setupLayers(),this._queueRedraw(!0)),!i&&t!==void 0&&this._windowHours()>t&&this._entryId&&(this._disconnect(),this._connect()),i&&(this._disconnect(),this._clearVessels(),this._connect())}getCardSize(){return 7}getGridOptions(){return{columns:12,rows:7,min_rows:4,min_columns:6}}connectedCallback(){super.connectedCallback(),this._map&&(this._connect(),this._startTick(),this._tileToken!==null&&this._refreshTileToken())}disconnectedCallback(){super.disconnectedCallback(),this._disconnect(),window.clearInterval(this._tickTimer),this._tickTimer=void 0,window.clearInterval(this._tokenTimer),this._tokenTimer=void 0}firstUpdated(){let e=this.renderRoot.querySelector("#map");this._resizeObserver=new ResizeObserver(()=>{!e.clientWidth||!e.clientHeight||(this._map?(this._map.invalidateSize(),!this._fitted&&this._lastBoxes&&this._fitOnce(this._lastBoxes)):this._initMap(e))}),this._resizeObserver.observe(e)}_initMap(e){this._renderer=d.canvas({padding:.5}),this._map=d.map(e,{preferCanvas:!0,zoomControl:!0,attributionControl:!0,worldCopyJump:!0}).setView([0,0],2),this._map.attributionControl.setPrefix(!1),this._map.createPane("basemap").style.zIndex="150";let t=this._map.createPane("aisLabels");t.style.zIndex="590",t.style.pointerEvents="none",this._map.on("zoomend",()=>this._layoutLabels()),this._regionLayer=d.layerGroup().addTo(this._map),this._historyLayer=d.layerGroup().addTo(this._map),this._map.on("popupclose",()=>{this._history||(this._selected=void 0,this._historyGen++,this._historyLayer?.clearLayers(),this._queueRedraw())}),this._setupLayers(),this._connect(),this._startTick()}updated(e){if(e.has("hass")&&this.hass){let t=!!this.hass.themes?.darkMode;t!==this._darkMode&&(this._darkMode=t,this._map&&this._setupLayers()),this._map&&!this._unsub&&!this._connecting&&this._retryTimer===void 0&&this._connect()}}_startTick(){if(this._tokenTimer===void 0&&(this._tokenTimer=window.setInterval(()=>{this._tileToken!==null&&this._refreshTileToken()},20*6e4)),this._tickTimer!==void 0)return;let e=(this._config?.track_minutes??ge)*60;this._tickTimer=window.setInterval(()=>{this._prune(),this._queueRedraw(!0)},Math.min(6e4,Math.max(5e3,e*1e3/20)))}_baseKey(){let e=this._config;if(e.tile_url)return"custom";let t=e.base??"simple";return t!=="osm"&&!t.startsWith("simple")&&(t="simple"),t==="simple"&&(t=this._darkMode?"simple-dark":"simple-light"),t.startsWith("simple")&&this._simpleFailed&&(t="osm"),t==="osm"&&this._tileToken===null&&!this._simpleFailed&&(t="simple-light"),t}_baseDef(e){let t=this._config;return e==="custom"?{url:t.tile_url,attribution:t.tile_attribution??"",maxZoom:19}:e==="osm"?{...fe.osm,url:`/api/map_tiles/raster/{z}/{x}/{y}.png?token=${encodeURIComponent(this._tileToken??"")}`}:fe[e]}async _setupSimple(e,t){let i=`simple|${e}|${t}`;if(this._baseLayerKey!==i){this._baseLayerKey=i;try{this._basemapModule??=import("./basemap-KUK4C7BD.js");let o=await this._basemapModule;if(this._baseLayerKey!==i||!this._map)return;if(!o.supported())throw new Error("WebGL is not available");if(!this._maplibreCssAdded){let a=document.createElement("style");a.textContent=o.maplibreCss,this.renderRoot.appendChild(a),this._maplibreCssAdded=!0}this._baseLayer?.remove(),this._baseLayer=o.createSimpleLayer(e,t,"basemap").addTo(this._map)}catch(o){console.warn("aisstream-map-card: simple base map unavailable, using OpenStreetMap",o),this._simpleFailed=!0,this._baseLayerKey=void 0,this._setupLayers()}}}async _refreshTileToken(){if(this.hass){try{let e=await this.hass.callWS({type:"map_tiles/access_token"});this._tileToken=e.token}catch{this._tileToken=null}this._setupLayers()}}_setupLayers(){if(!this._map||!this._config)return;let e=this._baseKey();if(this._map.getContainer().classList.toggle("dark-base",e==="simple-dark"),e==="osm"&&this._tileToken===void 0)this._refreshTileToken();else if(e.startsWith("simple"))this._setupSimple(e==="simple-dark",this._config.map_labels!==!1);else{let t=this._baseDef(e);if(!this._baseLayer||this._baseLayerKey!==e){this._baseLayer?.remove(),this._baseLayerKey=e;let i=d.tileLayer(t.url,{attribution:t.attribution,maxZoom:t.maxZoom,maxNativeZoom:Math.min(t.maxZoom,19),subdomains:t.subdomains??"abc"}).addTo(this._map);i.bringToBack(),this._baseLayer=i}else this._baseLayer._url!==t.url&&this._baseLayer.setUrl(t.url,!0)}this._config.seamarks&&!this._seamarks?this._seamarks=d.tileLayer(ee.url,{attribution:ee.attribution,maxZoom:19,maxNativeZoom:ee.maxZoom,zIndex:5}).addTo(this._map):!this._config.seamarks&&this._seamarks&&(this._seamarks.remove(),this._seamarks=void 0)}_windowHours(){let e=this._config,t=Math.max(e.track_minutes??ge,e.stale_minutes??10,e.moving_stale_minutes??20);return Math.min(24,Math.max(.1,t/60))}_now(){return Date.now()/1e3+this._skew}async _connect(){if(!this.hass||!this._map||this._connecting||this._unsub)return;this._connecting=!0;let e=++this._connGen,t=()=>e!==this._connGen||!this.isConnected;window.clearTimeout(this._retryTimer),this._retryTimer=void 0;try{let i=await this.hass.callWS({type:"aisstream/snapshot",hours:this._windowHours(),...this._config.entry_id?{entry_id:this._config.entry_id}:{}});if(t())return;this._entryId=i.entry_id,this._applySnapshot(i);let o=await this.hass.connection.subscribeMessage(a=>{e===this._connGen&&this._onDelta(a)},{type:"aisstream/subscribe",entry_id:i.entry_id});if(t()){o().catch(()=>{});return}this._unsub=o,this._status=i.connected?"live":"offline",this._error=""}catch(i){if(t())return;this._status="error",this._error=i?.message??String(i),this._scheduleRetry()}finally{e===this._connGen&&(this._connecting=!1)}}_disconnect(){this._connGen++,this._connecting=!1,window.clearTimeout(this._retryTimer),this._retryTimer=void 0;let e=this._unsub;this._unsub=void 0,e?.().catch(()=>{})}_scheduleRetry(e=1e4){window.clearTimeout(this._retryTimer),this._retryTimer=window.setTimeout(()=>{this._retryTimer=void 0,this._connect()},e)}_applySnapshot(e){this._skew=e.now-Date.now()/1e3,this._favorites=new Map(e.favorites.map(t=>[t.mmsi,{alias:t.alias,retention_days:t.retention_days}])),this._clearVessels();for(let t of e.vessels){let{track:i,...o}=t;this._vessels.set(t.mmsi,{data:o,track:i??[],lines:[]})}this._drawRegion(e.boxes),this._lastBoxes=e.boxes,this._fitted||this._fitOnce(e.boxes),this._queueRedraw(!0)}_onDelta(e){if(e.type==="closed"){let t=this._unsub;this._unsub=void 0,t?.().catch(()=>{}),this._status="offline",this._scheduleRetry(5e3);return}e.now&&(this._skew=e.now-Date.now()/1e3),e.connected!==void 0&&(this._status=e.connected?"live":"offline");for(let t of e.vessels??[]){let i=this._vessels.get(t.mmsi);i?i.data=t:this._vessels.set(t.mmsi,{data:t,track:[],lines:[]})}for(let[t,i]of Object.entries(e.reset??{})){let o=this._vessels.get(Number(t));o&&(o.track=[...i]),this._selected===Number(t)&&this._historyLayer?.clearLayers()}for(let[t,i]of Object.entries(e.points??{})){let o=this._vessels.get(Number(t));if(!o)continue;let a=o.track.length?o.track[o.track.length-1][0]:-1;for(let l of i)l[0]>a&&o.track.push(l)}this._queueRedraw()}_prune(){let e=this._now()-this._windowHours()*O;for(let[t,i]of this._vessels){let o=i.track.findIndex(a=>a[0]>=e);o>0?i.track.splice(0,o):o===-1&&(i.track.length=0),(i.data.last_seen??0)<e&&!i.data.favorite&&this._removeVessel(t)}}_clearVessels(){for(let e of[...this._vessels.keys()])this._removeVessel(e)}_removeVessel(e){let t=this._vessels.get(e);t&&(t.marker?.remove(),t.label?.remove(),t.lines.forEach(i=>i.remove()),this._vessels.delete(e))}_drawRegion(e){this._regionLayer?.clearLayers();for(let[[t,i],[o,a]]of e)d.rectangle([[t,i],[o,a]],{color:"#5c9ded",weight:1,dashArray:"4 6",fill:!1,interactive:!1}).addTo(this._regionLayer)}_fitOnce(e){let t=this._map?.getSize();!t||!t.x||!t.y||(this._fit(e),this._fitted=!0)}_fit(e){if(this._map){if(this._config.fit==="vessels"){let t=[...this._vessels.values()].filter(i=>i.data.lat!==null).map(i=>[i.data.lat,i.data.lon]);if(t.length){this._map.fitBounds(d.latLngBounds(t),{padding:[20,20],maxZoom:15});return}}if(e.length){let t=d.latLngBounds([]);for(let[i,o]of e)t.extend(i).extend(o);this._map.fitBounds(t,{padding:[10,10]})}}}_queueRedraw(e=!1){if(e)for(let t of this._vessels.values())t.trackKey=void 0;this._redrawQueued||(this._redrawQueued=!0,requestAnimationFrame(()=>{this._redrawQueued=!1,this._redraw()}))}_isMoving(e,t){return e.moving&&!(e.slow_since&&t-e.slow_since>=gt)}_isStale(e,t){let i=this._config,o=(e.sog??0)>mt?i.moving_stale_minutes:i.stale_minutes;return(e.last_seen??0)<t-o*60}_passesFilters(e,t){let i=e.data;return i.lat===null||i.lon===null?!1:i.favorite&&this._config.show_favorites?!0:!(this._isStale(i,t)||this._hideStopped&&!this._isMoving(i,t))}_isVisible(e,t){if(!this._passesFilters(e,t))return!1;let i=e.data;return i.favorite&&!!this._config.show_favorites||!this._hidden.has(i.category)}_redraw(){if(!this._map)return;let e=this._now(),t={},i=0;for(let[o,a]of this._vessels){let l=a.data;if(this._passesFilters(a,e)&&(t[l.category]=(t[l.category]??0)+1),!this._isVisible(a,e)){a.marker?.remove(),a.marker=void 0,a.label?.remove(),a.label=void 0,a.iconKey=void 0,a.lines.forEach(r=>r.remove()),a.lines=[],a.trackKey=void 0;continue}i++,this._drawMarker(o,a,this._isStale(l,e),this._isMoving(l,e)),this._drawLabel(a),this._drawTrack(o,a,e)}this._layoutLabels(),this._counts=t,this._shown=i}_drawLabel(e){let t=this._favorites.get(e.data.mmsi),i=this._config.show_names?t?.alias||e.data.name:null;if(!i||!e.marker){e.label?.remove(),e.label=void 0;return}let o=e.marker.getLatLng();if(e.label&&e.labelText===i){e.label.setLatLng(o);return}e.label?.remove(),e.labelText=i,e.labelWidth=Math.ceil(this._textWidth(i))+4,e.label=d.marker(o,{pane:"aisLabels",interactive:!1,keyboard:!1,icon:d.divIcon({className:"ais-label",html:P(i),iconSize:[e.labelWidth,G],iconAnchor:[-be,G/2]})}).addTo(this._map)}_textWidth(e){return this._measureCtx??=document.createElement("canvas").getContext("2d"),this._measureCtx?(this._measureCtx.font=je,this._measureCtx.measureText(e).width):e.length*7}_layoutLabels(){if(!this._map)return;let e=[],t=[];for(let i of this._vessels.values()){if(!i.marker)continue;let o=this._map.latLngToLayerPoint(i.marker.getLatLng());if(e.push([o.x-7,o.y-9,o.x+7,o.y+9]),i.label){let a=i.data,l=(this._selected===a.mmsi?1e6:0)+(a.favorite?1e5:0)+(this._isMoving(a,this._now())?1e4:0)+(a.length??0);t.push({e:i,x:o.x,y:o.y,prio:l})}}t.sort((i,o)=>o.prio-i.prio);for(let{e:i,x:o,y:a}of t){let l=[o+be,a-G/2,o+be+i.labelWidth,a+G/2],r=e.some(p=>l[0]<p[2]&&l[2]>p[0]&&l[1]<p[3]&&l[3]>p[1]),c=i.label.getElement();c&&(c.style.visibility=r?"hidden":""),r||e.push(l)}}_drawMarker(e,t,i,o){let a=t.data,l=a.heading??(a.underway?a.cog:null)??0,r=this._selected===e,c=(a.length??0)>=100,p=[a.category,Math.round(l),o,a.favorite,i,r,c].join("|"),h=[a.lat,a.lon];t.marker?(t.marker.setLatLng(h),t.marker.isPopupOpen()&&this._refreshPopup(e,t.marker)):(t.marker=d.marker(h,{keyboard:!1,riseOnHover:!0}),t.marker.bindTooltip(()=>P(this._displayName(a.mmsi)),{direction:"top",offset:[0,-8]}),t.marker.bindPopup(()=>this._popupContent(e),{maxWidth:300,minWidth:220}),t.marker.on("popupopen",f=>this._onPopupOpen(e,f)),t.marker.addTo(this._map)),t.iconKey!==p&&(t.iconKey=p,t.marker.setIcon(this._icon(a.category,l,o,a.favorite,i,r,c)),t.marker.setZIndexOffset(r?2e3:a.favorite?1e3:0))}_icon(e,t,i,o,a,l,r){let c=S[e]??S.unknown,p=(r?30:24)+(o||l?4:0),h=o?w:l?"#ffffff":"rgba(0,0,0,0.8)",f=o||l?2:1,m=i?1:.55,g=a?.45:1,k=`<path d="M0,-11 L4.5,-4 L4.5,10 L-4.5,10 L-4.5,-4 Z" fill="${c}" fill-opacity="${m}" stroke="${h}" stroke-width="${f}" stroke-linejoin="round" transform="rotate(${t})"/>`,K=o?`<text x="6.5" y="-6" font-size="9" fill="${w}" stroke="rgba(0,0,0,0.7)" stroke-width="0.5">\u2605</text>`:"";return d.divIcon({className:"ais-marker",html:`<svg width="${p}" height="${p}" viewBox="-12 -12 24 24" style="opacity:${g};overflow:visible">${k}${K}</svg>`,iconSize:[p,p],iconAnchor:[p/2,p/2],tooltipAnchor:[0,0],popupAnchor:[0,-p/2]})}_drawTrack(e,t,i){let o=this._config,a=o.track_minutes*60,l=i-a,r=t.track.filter(b=>b[0]>=l),c=t.data,p=r.length?r[r.length-1][0]:-1;c.lat!==null&&c.lon!==null&&c.position_ts!==null&&c.position_ts>p&&c.position_ts>=l&&r.push([c.position_ts,c.lat,c.lon]);let h=this._selected===e,f=`${r.length}|${r.length?r[0][0]:0}|${r.length?r[r.length-1][0]:0}|${h}|${c.favorite}|${c.category}`;if(!o.show_tracks||r.length<2){t.lines.forEach(b=>b.remove()),t.lines=[],t.trackKey=void 0;return}if(t.trackKey===f)return;t.trackKey=f,t.lines.forEach(b=>b.remove()),t.lines=[];let m=S[t.data.category]??S.unknown,g=h?4:t.data.favorite?3:2,k=0,K=this._config.stale_minutes*60;for(let b=me.length-1;b>=0;b--){let Ge=b>0?me[b-1][0]*a:0,We=h?1:me[b][1],R=[[]],_=k;for(;_<r.length&&!(i-r[_][0]<Ge);_++)_>k&&r[_][0]-r[_-1][0]>K&&R.push([]),R[R.length-1].push([r[_][1],r[_][2]]);let ve=R[R.length-1];_<r.length&&ve.length&&r[_][0]-r[_-1][0]<=K&&ve.push([r[_][1],r[_][2]]),k=_;let ye=R.filter(xe=>xe.length>=2);ye.length&&t.lines.push(d.polyline(ye,{renderer:this._renderer,color:t.data.favorite&&!h?w:m,weight:g,opacity:We,interactive:!1,smoothFactor:1}).addTo(this._map))}}_displayName(e){let t=this._favorites.get(e),i=this._vessels.get(e)?.data;return t?.alias||i?.name||`MMSI ${e}`}_popupRows(e){let t=this._vessels.get(e);if(!t)return[];let i=t.data,o=this._now(),a=[],l=(f,m)=>{m!=null&&m!==""&&a.push(`<tr><th>${f}</th><td>${P(m)}</td></tr>`)},r=X[i.category]??i.category;l("MMSI",i.mmsi),l("Type",`${r}${i.ship_type?` (${i.ship_type})`:""}${i.ais_class?` \xB7 Class ${i.ais_class}`:""}`),i.callsign&&l("Call sign",i.callsign),i.imo&&l("IMO",i.imo);let c=[i.sog!==null?`${i.sog.toFixed(1)} kn`:null,i.cog!==null?`COG ${Math.round(i.cog)}\xB0`:null,i.heading!==null?`HDG ${i.heading}\xB0`:null].filter(Boolean);l("Motion",c.join(" \xB7 "));let p=i.nav_status!==null&&i.nav_status!==15?De[i.nav_status]:void 0,h=i.status?Be[i.status]??i.status:p;return h&&l("Status",p&&p!==h?`${h} (reports ${p.toLowerCase()})`:h),i.destination&&l("Destination",`${i.destination}${i.eta?` (ETA ${i.eta})`:""}`),i.length&&l("Size",`${i.length} \xD7 ${i.beam??"?"} m${i.draught?`, draught ${i.draught} m`:""}`),i.last_seen&&l("Last seen",Ve(o-i.last_seen)),a}_popupBody(e){let t=this._vessels.get(e);if(!t)return"";let i=t.data,o=this._favorites.get(e),a=P(this._displayName(e)),l=o?.alias&&i.name?`<div class="sub">${P(i.name)}</div>`:"",r=i.favorite?'<span class="star" title="Favorite">\u2605</span>':"";return`<div class="title">${a} ${r}</div>${l}
      <table>${this._popupRows(e).join("")}</table>`}_refreshPopup(e,t){let i=t.getPopup()?.getElement()?.querySelector(".ais-popup-body");if(!i)return;let o=this._popupBody(e);i.getAttribute("data-html")!==o&&(i.innerHTML=o,i.setAttribute("data-html",o))}_popupContent(e){let t=this._vessels.get(e);if(!t)return"";let i=t.data,o="";i.favorite&&(o=`<div class="history"><span>History</span>${this._historyRanges(e).map(r=>`<button data-range="${r}">${r}</button>`).join("")}</div>`);let a=`https://www.marinetraffic.com/en/ais/details/ships/mmsi:${i.mmsi}`;return`<div class="ais-popup">
      <div class="ais-popup-body">${this._popupBody(e)}</div>
      ${o}
      <a href="${a}" target="_blank" rel="noopener noreferrer">MarineTraffic \u2197</a>
    </div>`}_onPopupOpen(e,t){this._history?.mmsi!==e&&this._clearHistory(),this._selected=e,this._queueRedraw();let i=t.popup.getElement();!i||i.dataset.aisBound||(i.dataset.aisBound="1",i.addEventListener("click",o=>{let a=o.target.closest("button[data-range]");if(!a)return;o.stopPropagation();let l=_e.find(([r])=>r===a.dataset.range);l&&this._loadHistory(e,l[0])}))}_clearHistory(){this._historyGen++,this._historyLayer?.clearLayers(),this._history&&(this._history=void 0,this._selected=void 0,this._queueRedraw())}_closeHistory(){this._clearHistory(),this._map?.closePopup()}_showDetails(){let e=this._history?.mmsi;if(e===void 0||!this._map)return;let t=this._vessels.get(e);if(t?.marker){t.marker.openPopup();return}let i=t?.data;if(i?.lat==null||i.lon==null)return;let o=d.popup({maxWidth:300,minWidth:220}).setLatLng([i.lat,i.lon]).setContent(()=>this._popupContent(e)).openOn(this._map);this._onPopupOpen(e,{popup:o})}async _loadHistory(e,t){let i=_e.find(([l])=>l===t)?.[1]??null,o=++this._historyGen;this._history={mmsi:e,range:t,status:"Loading\u2026"},this._selected=e,this._map?.closePopup();let a=l=>{o===this._historyGen&&this._history&&(this._history={...this._history,status:l})};try{let l=this._now(),r=await this.hass.callWS({type:"aisstream/track",entry_id:this._entryId,mmsi:e,start:i===null?0:l-i});if(o!==this._historyGen)return;if(this._historyLayer?.clearLayers(),r.track.length>=2){let p=r.track[r.track.length-1][0]-r.track[0][0],h=Math.max(30*60,3*p/5e3),f=[[]];r.track.forEach((g,k)=>{k>0&&g[0]-r.track[k-1][0]>h&&f.push([]),f[f.length-1].push([g[1],g[2]])});let m=d.polyline(f.filter(g=>g.length>=2),{renderer:this._renderer,color:w,weight:3,opacity:.95,dashArray:"6 5",interactive:!1}).addTo(this._historyLayer);this._map.fitBounds(m.getBounds(),{padding:[30,30],maxZoom:15})}let c=r.first_ts?new Date(r.first_ts*1e3).toLocaleDateString():null;a(`${r.track.length} points${c?` \xB7 since ${c}`:""}`)}catch(l){a(`Error: ${l?.message??l}`)}}_toggleStopped(){this._hideStopped=!this._hideStopped,this._queueRedraw(!0)}_soloCategory(e){let t=Object.keys(S).filter(o=>o!==e),i=!this._hidden.has(e)&&t.every(o=>this._hidden.has(o));this._hidden=i?new Set:new Set(t),this._queueRedraw()}_toggleCategory(e){let t=new Set(this._hidden);t.has(e)?t.delete(e):t.add(e),this._hidden=t,this._queueRedraw()}_historyRanges(e){let t=this._favorites.get(e)?.retention_days??null;return _e.filter(([,i])=>t===null||i===null||i<=Math.max(t,1)*86400).map(([i])=>i)}_renderHistoryPanel(){let e=this._history;return e?A`<div class="overlay history-panel">
      <div class="panel">
        <div class="panel-head">
          <span class="star">★</span>
          <span class="panel-name">${this._displayName(e.mmsi)}</span>
          <button class="icon" title="Vessel details" @click=${this._showDetails}>ⓘ</button>
          <button class="icon" title="Close history" @click=${this._closeHistory}>✕</button>
        </div>
        <div class="panel-ranges">
          ${this._historyRanges(e.mmsi).map(t=>A`<button
              class=${t===e.range?"active":""}
              @click=${()=>this._loadHistory(e.mmsi,t)}
            >
              ${t}
            </button>`)}
        </div>
        <div class="panel-status">${e.status}</div>
      </div>
    </div>`:u}render(){if(!this._config)return u;let e=this._config,t=e.aspect_ratio?`aspect-ratio: ${e.aspect_ratio.replace(":"," / ")}`:`height: ${e.height??"100%"}; min-height: ${e.height??"320px"}`,i=this._shown,o=new Set([...this._vessels.values()].filter(r=>r.data.lat!==null).map(r=>r.data.category)),a=Object.keys(S).filter(r=>this._counts[r]||this._hidden.has(r)&&o.has(r)),l=this._status==="live"?"Live":this._status==="loading"?"Loading\u2026":this._status==="offline"?"Reconnecting":"Error";return A`
      <ha-card .header=${e.title}>
        <div class="wrap" style=${t}>
          <div id="map"></div>
          <div class="overlay top-right">
            <span class="status ${this._status}" title=${this._error}>${l}</span>
            <button
              class="chip toggle ${this._hideStopped?"active":""}"
              @click=${this._toggleStopped}
              title=${this._hideStopped?"Show stopped vessels":"Hide stopped vessels"}
            >
              ${this._hideStopped?"Stopped hidden":"Hide stopped"}
            </button>
            <span class="count">${i} vessels</span>
          </div>
          ${this._renderHistoryPanel()}
          ${a.length?A`<div class="overlay legend">
                ${a.map(r=>A`<button
                    class="chip ${this._hidden.has(r)?"off":""}"
                    @click=${()=>this._toggleCategory(r)}
                    @dblclick=${()=>this._soloCategory(r)}
                    title="${X[r]}: click to show/hide, double-click to show only this"
                  >
                    <span class="dot" style="background:${S[r]}"></span>${X[r]}
                    <span class="n">${this._counts[r]??0}</span>
                  </button>`)}
              </div>`:u}
        </div>
      </ha-card>
    `}};W.properties={hass:{attribute:!1},_config:{state:!0},_status:{state:!0},_hidden:{state:!0},_hideStopped:{state:!0},_counts:{state:!0},_shown:{state:!0},_history:{state:!0}},W.styles=[y(Ie),U`
      :host {
        display: block;
        height: 100%;
      }
      ha-card {
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .wrap {
        position: relative;
        flex: 1;
        width: 100%;
      }
      /* !important: Leaflet sets an inline position:relative when it
         initialises while the card is detached, collapsing the map. */
      #map {
        position: absolute !important;
        inset: 0;
        background: #aad3df;
      }
      .overlay {
        position: absolute;
        z-index: 1000;
        display: flex;
        gap: 4px;
        pointer-events: none;
      }
      .overlay > * {
        pointer-events: auto;
      }
      .top-right {
        top: 8px;
        right: 8px;
      }
      .legend {
        left: 8px;
        bottom: 22px;
        right: 8px;
        flex-wrap: wrap;
      }
      .status,
      .count,
      .chip {
        font: 500 12px/1 var(--ha-font-family-body, Roboto, sans-serif);
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #222);
        border-radius: 12px;
        padding: 5px 9px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        border: none;
      }
      .status::before {
        content: "";
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        margin-right: 5px;
        background: var(--disabled-color, #999);
      }
      .status.live::before {
        background: var(--success-color, #43a047);
      }
      .status.error::before {
        background: var(--error-color, #db4437);
      }
      .chip {
        cursor: pointer;
        user-select: none;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .chip.toggle.active {
        background: var(--primary-color, #03a9f4);
        color: var(--text-primary-color, #fff);
      }
      .chip.off {
        opacity: 0.45;
        text-decoration: line-through;
      }
      .dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
      }
      .n {
        color: var(--secondary-text-color, #666);
      }
      .ais-label {
        font: ${y(je)};
        line-height: ${G}px;
        color: #1d2730;
        white-space: nowrap;
        text-shadow: 0 0 2px #fff, 0 0 2px #fff, 0 0 3px #fff;
        background: none;
        border: none;
      }
      .dark-base .ais-label {
        color: #e3e9ef;
        text-shadow: 0 0 2px #000, 0 0 2px #000, 0 0 3px #000;
      }
      .ais-marker {
        background: none;
        border: none;
      }
      .leaflet-popup-content-wrapper,
      .leaflet-popup-tip {
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #222);
      }
      .ais-popup {
        font: 13px/1.35 var(--ha-font-family-body, Roboto, sans-serif);
      }
      .ais-popup .title {
        font-weight: 600;
        font-size: 15px;
      }
      .ais-popup .sub {
        color: var(--secondary-text-color, #666);
        margin-bottom: 4px;
      }
      .ais-popup .star {
        color: ${y(w)};
      }
      .ais-popup table {
        border-collapse: collapse;
        margin: 6px 0;
      }
      .ais-popup th {
        text-align: left;
        font-weight: 500;
        color: var(--secondary-text-color, #666);
        padding: 1px 10px 1px 0;
        vertical-align: top;
        white-space: nowrap;
      }
      .ais-popup .history {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
        margin: 6px 0 2px;
      }
      .ais-popup .history button {
        font-size: 12px;
        padding: 2px 7px;
        border-radius: 10px;
        border: 1px solid var(--divider-color, #ccc);
        background: var(--secondary-background-color, #f5f5f5);
        color: var(--primary-text-color, #222);
        cursor: pointer;
      }
      /* Details can be selected and copied (MMSI, call sign…). */
      .leaflet-popup-content {
        user-select: text;
        -webkit-user-select: text;
        cursor: auto;
      }
      .history-panel {
        top: 8px;
        left: 52px;
        max-width: max(170px, calc(100% - 200px));
      }
      .panel {
        font: 12px/1.3 var(--ha-font-family-body, Roboto, sans-serif);
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #222);
        border-radius: 10px;
        padding: 6px 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        min-width: 0;
      }
      .panel-head {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 600;
      }
      .panel-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .panel .star {
        color: ${y(w)};
      }
      .panel button {
        font: inherit;
        font-weight: 400;
        border: 1px solid var(--divider-color, #ccc);
        background: var(--secondary-background-color, #f5f5f5);
        color: var(--primary-text-color, #222);
        border-radius: 10px;
        padding: 1px 7px;
        cursor: pointer;
      }
      .panel button.icon {
        border: none;
        background: none;
        padding: 0 3px;
        font-size: 14px;
        color: var(--secondary-text-color, #666);
      }
      .panel button.active {
        background: ${y(w)};
        border-color: ${y(w)};
        color: #000;
      }
      .panel-ranges {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        margin-top: 4px;
      }
      .panel-status {
        color: var(--secondary-text-color, #666);
        font-size: 11px;
        margin-top: 3px;
      }
      .ais-popup a {
        color: var(--primary-color, #03a9f4);
        font-size: 12px;
      }
    `];customElements.get("aisstream-map-card")||(customElements.define("aisstream-map-card",W),window.customCards=window.customCards||[],window.customCards.push({type:"aisstream-map-card",name:"AIS ship map",description:"Live ship positions and tracks from the AISStream integration",preview:!1,documentationURL:"https://github.com/hlgirard/hacs-aisstream"}),console.info(`%c AISSTREAM-MAP-CARD %c ${Fe} `,"color:#fff;background:#2f6fd6",""));
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/lit-html.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-element/lit-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
