import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

// Composers
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { BleachBypassShader } from 'three/examples/jsm/shaders/BleachBypassShader.js';
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js';

const setupComposer = () => {
    const sceneOpts = renderSession.input.options;
    var composer, effectFXAA;

    const renderModel = new RenderPass( renderSession.scene, renderSession.camera );
    const effectBleach = new ShaderPass( BleachBypassShader );
    const effectColor = new ShaderPass( ColorCorrectionShader );
    const outputPass = new OutputPass();
    effectFXAA = new ShaderPass( FXAAShader );
    effectFXAA.uniforms[ 'resolution' ].value.set( 1 / sceneOpts.resolution.width, 1 / sceneOpts.resolution.height );
    effectBleach.uniforms[ 'opacity' ].value = 0.2;
    effectColor.uniforms[ 'powRGB' ].value.set( 1.4, 1.45, 1.45 );
    effectColor.uniforms[ 'mulRGB' ].value.set( 1.1, 1.1, 1.1 );

    const renderTarget = new THREE.WebGLRenderTarget( sceneOpts.resolution.width, sceneOpts.resolution.height, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture() } );

    composer = new EffectComposer( renderSession.renderer, renderTarget );

    composer.addPass( renderModel );
    composer.addPass( effectBleach );
    composer.addPass( effectColor );
    composer.addPass( outputPass );
    composer.addPass( effectFXAA );

    composer.render();

    return composer;

}

const setupScene = () => {
    const sceneOpts = renderSession.input.options;
    renderSession.scene.background = new THREE.Color(sceneOpts.background.color); 

    const ambientLight = new THREE.AmbientLight(sceneOpts.ambientLight.color, sceneOpts.ambientLight.intensity);
    ambientLight.name = 'ambientLight';
    renderSession.scene.add(ambientLight);  

    const fog = new THREE.Fog(sceneOpts.fog.color, sceneOpts.fog.near, sceneOpts.fog.far);
    renderSession.scene.fog = fog;

    // Truoc nguc
    const light = new THREE.DirectionalLight(0xffffff, .33);
    light.name = "Light-1";
    renderSession.scene.add(light);

    // Sau lung
    const light2 = new THREE.DirectionalLight(0xffffff, .33);
    light2.name = "Light-2";
    renderSession.scene.add(light2);

    // Dinh dau
    const light3 = new THREE.DirectionalLight(0xffffff, .33);
    light3.name = "Light-3";
    renderSession.scene.add(light3);

    // Duoi dau
    const light4 = new THREE.DirectionalLight(0xffffff, .33);
    light4.name = "Light-4";
    renderSession.scene.add(light4);

    // add grid
    // const grid = new THREE.GridHelper( 100, 100, 0xffffff, 0xffffff );
    // grid.material.opacity = 0.2;
    // grid.material.transparent = true;
    // grid.name = 'grid';
    // renderSession.scene.add( grid );

}

const init = (input) => {

    const sceneOpts = input.options;

    const canvas = document.createElement('canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, sceneOpts.resolution.width / sceneOpts.resolution.height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true  });
    const controls = new OrbitControls(camera, renderer.domElement);
    const clock = new THREE.Clock();

    canvas.width = sceneOpts.resolution.width;
    canvas.height = sceneOpts.resolution.height;

    renderer.setSize(sceneOpts.resolution.width, sceneOpts.resolution.height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);

    renderer.autoClear = false;
    
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;



    
    camera.setFocalLength(55);


    document.body.appendChild(renderer.domElement);

    renderSession = {
        input,
        scene,
        camera,
        renderer,
        controls,
        clock,
    };

    const composer = setupComposer();
    renderSession.composer = composer;

    setupScene();

};

export default init;