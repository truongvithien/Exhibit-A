import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { adjustAnimation, getFBXsOffset } from './_support.js';

const _DEFAULT_COLLISIONS_SETTINGS = {
    headLevel: 3,
    bodyLevel: 2,
    reduceRate: 0.3,
    reduceFromFrame: 5
};

const executeMocap = ({
    characterIndex,
    fbx
}) => {
    const character = renderSession.input.characters.data[characterIndex];

    const modelHeight = renderSession.input.characters.data[characterIndex].modelHeight;
    // Set default position of camera and controls
    renderSession.camera.position.set(
        0, 
        modelHeight * .7 ,
        modelHeight * 2.5
    );
    renderSession.controls.target.set(
        0, 
        modelHeight * .6 , 
        modelHeight * .8
    );

    fbx.name = character.name;
    fbx.traverse((c) => {
        if (c.isBone) {
            if (c.name.includes('_1')) {
                c.name = c.name.replace('_1', '');
            }
        }
    });
    fbx.animations.forEach((clip) => {
        clip.tracks.forEach((track) => {
            track.name = track.name.replace('_1', '');
        });
    });
    const bones = [];
    fbx.traverse(c => {
        if (c.isBone) {
            bones.push(c);
        }
    });
    const skeleton = new THREE.Skeleton(bones);
    fbx.skeleton = skeleton;

    const mocapClone = SkeletonUtils.clone(fbx);
    const fbxsOffset = getFBXsOffset(character.model, fbx);
    mocapClone.animations = fbx.animations;
    const mocapMixer = new THREE.AnimationMixer(character.model);
    const mocapAnimation = mocapClone.animations[0].clone();

    
    var collisionSettings = _DEFAULT_COLLISIONS_SETTINGS;
    // console.log(character);
    const modalColvalues = character.model.children.find((c) => c.name.toUpperCase().includes('COL_VALUE'));
    if (modalColvalues) {
        const colValues = modalColvalues.children.find((c) => c.name.toUpperCase().includes('COLVALUE'));
        if (colValues) {
            collisionSettings.headLevel = colValues.position.x;
            collisionSettings.bodyLevel = colValues.scale.x;
            collisionSettings.reduceRate = colValues.position.y;
            collisionSettings.reduceFromFrame = colValues.position.z;
        }
    }

    const mocapCamera = fbx.children.find((c) => c.name.toUpperCase().includes('CAMERA'));
    if (mocapCamera) {
        const mocapTransCam = mocapCamera.children.find((child) => child.name.toUpperCase().includes("TRANS_CAMERA"));
        if (mocapTransCam) {
            renderSession.camera.position.x = mocapTransCam.position.x;
            renderSession.camera.position.y = mocapTransCam.position.z;
            renderSession.camera.position.z = - mocapTransCam.position.y;
        }
    }

    renderSession.input.characters.data[characterIndex].mocap = fbx;
    renderSession.input.characters.data[characterIndex].animations = {
        mixer: mocapMixer,
        animOriginal: mocapClone.animations[0],
        animAdjusted: null
    };

    const trackingSpheres = renderSession.input.characters.data[characterIndex].trackingSpheres;

    adjustAnimation(mocapAnimation, fbxsOffset, trackingSpheres, characterIndex, collisionSettings).then((adjustedAnimation) => {

        console.log("adjusted animation");

        renderSession.input.characters.data[characterIndex].animations.animAdjusted = adjustedAnimation;

        const action = mocapMixer.clipAction(adjustedAnimation);
        renderSession.input.characters.data[characterIndex].animations.action = action;

        let frameCount = Math.floor(adjustedAnimation.duration * parseInt(renderSession.input.options.fps));
        renderSession.input.characters.data[characterIndex].frameCount = frameCount;


        // frameCount = Math.floor(adjustedAnimation.duration * parseInt(renderSession.input.options.fps));
        // renderSession.input.characters.data[characterIndex].frameCount = frameCount;

        action.play();
        // if (renderSession.input.isPuppeteer) {
        //     action.play();
        // }


    });





}

export default executeMocap; 