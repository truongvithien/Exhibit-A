import * as THREE from 'three';
import { getObjectHeight } from './_support.js';
import imageProcessing from './_image_processing.js';

const executeModel = ({
    characterIndex,
    fbx
}) => {
    const character = renderSession.input.characters.data[characterIndex];

    fbx.name = character.name;
    fbx.position.x = character.position.x;
    // actions by defaults
    fbx.traverse(c => {
        c.castShadow = true;
        c.receiveShadow = true;
        c.frustumCulled = false;
    });

    const bones = [];
    fbx.traverse(c => {
        if (c.isBone) {
            bones.push(c);
        }
    });
    const skeleton = new THREE.Skeleton(bones);
    fbx.skeleton = skeleton;

    fbx.rotation.x = - Math.PI / 2; 

    // Remove colliders detection helper meshes
    fbx.traverse((c) => {
        if (c.isMesh) {
            if (c.name.toUpperCase().includes('COLLIDEBODY')) {
                collider = c.clone();
                c.visible = false;
                c.remove();
            }
        } 
    });

    // add to scene
    renderSession.input.characters.data[characterIndex].modelHeight = getObjectHeight(fbx);
    renderSession.input.characters.data[characterIndex].model = fbx;
    renderSession.scene.add(fbx);

    // make skeletonHelper 
    const helper = new THREE.SkeletonHelper(fbx);
    helper.skeleton = fbx.children[1].skeleton;
    helper.name = fbx.name + '-Helper';
    character.helper = helper;


    const modelHeight = renderSession.input.characters.data[characterIndex].modelHeight;

    // Set position of lights
    // Truoc nguc
    const light = renderSession.scene.getObjectByName('Light-1');
    light.position.set(0, modelHeight * 0.5 , modelHeight * .4);
    light.target.position.set(0, modelHeight * .8 , 0);

    // Sau lung
    const light2 = renderSession.scene.getObjectByName('Light-2');
    light2.position.set(0, modelHeight * .5, - modelHeight * .5);
    light2.target.position.set(0, modelHeight * .6 , 0);

    // Dinh dau
    const light3 = renderSession.scene.getObjectByName('Light-3');
    light3.position.set(0, modelHeight * 1.2, modelHeight * .5);
    light3.target.position.set(0, modelHeight * .8 , 0);

    // Duoi dau
    const light4 = renderSession.scene.getObjectByName('Light-4');
    light4.position.set(0, modelHeight * .6, modelHeight * .6);
    light4.target.position.set(0, modelHeight * .6 , 0);


    // Set camera and controls
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


    //  CUSTOM MATERIAL
    const customMaterial = character.customMaterial;
    const executeColorMapPromises = [];
    const executeAddOnTexturePromises = [];
    const executeNormalMapPromises = [];
    const executeRoughnessMapPromises = [];
    const executeMetalnessMapPromises = [];
    const executeEmissiveMapPromises = [];
    const executeAoMapPromises = [];
    const executeAlphaMapPromises = [];
    
    if (customMaterial.enable === "true") {
        const mapSize = 2048;

        const colorMapCanvas = imageProcessing.createCanvas(mapSize, mapSize, "colorMap");

        executeColorMapPromises.push(imageProcessing.addTileToCanvas(colorMapCanvas, parseInt(customMaterial.mapTiling), customMaterial.colorMapSrc));

        if (customMaterial.blurMapSrc != "") {
            const blurMapCanvas = imageProcessing.createCanvas(mapSize, mapSize);
            executeColorMapPromises.push(imageProcessing.addMaskedBlurToCanvas(colorMapCanvas, blurMapCanvas, parseFloat(customMaterial.blurIntensity), customMaterial.blurMapSrc));
        }

        if (customMaterial.addonTextures.length > 0) {
            customMaterial.addonTextures.forEach((addonTexture) => {
                executeAddOnTexturePromises.push(imageProcessing.addImageToCanvas(colorMapCanvas, addonTexture));
            });
        }

        Promise.all(executeColorMapPromises).then(() => {
            Promise.all(executeAddOnTexturePromises).then(() => {
                const colorMap = new THREE.TextureLoader().load(imageProcessing.canvasToBase64(colorMapCanvas));
                character.model.traverse((c) => {
                    if (c.isMesh) {
                        c.material.map = colorMap; 
                    }
                });
            });
        }); 

    } 

    
    let trackingBones = [];
    const trackingSpheres = new THREE.Group();
    trackingSpheres.name = 'TrackingSpheres';
    let trackingSphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });

    // Get object from model by name ends with "COL"

    const modelCOL_Target = fbx.children.find((child) => child.name.toUpperCase().includes('COL_TARGET'));
    const modelCOL_Source = fbx.children.find((child) => child.name.toUpperCase().includes('COL_SOURCE'));

    if (typeof modelCOL_Target !== 'undefined' && modelCOL_Target !== null) {
        modelCOL_Target.children.forEach((child) => {
        // model.getObjectByName("Piyomaru_COL").children.forEach((child) => {
            
            let boneName = child.name.replace("Vis_Collide", "");
            
            // Get radius of childmesh
            let radius = 0;
            child.geometry.computeBoundingSphere();
            radius = child.geometry.boundingSphere.radius;
            // radius = child.geometry.boundingSphere.radius * Math.cos(Math.PI / 4);

            // Add bone to trackingBones
            let bone = helper.bones.find((bone) => bone.name === boneName);
            trackingBones.push(bone);

            // Create a sphere for each vertex
            let trackingSphereGeometry = new THREE.SphereGeometry(radius, 16, 8);
            let trackingSphereMesh = new THREE.Mesh(trackingSphereGeometry, trackingSphereMaterial);
            trackingSphereMesh.material = new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
            trackingSphereMesh.name = boneName;
            trackingSphereMesh.radius = radius;
            trackingSphereMesh.position.setFromMatrixPosition(child.matrixWorld);
            trackingSpheres.add(trackingSphereMesh);

        });
    }

    if (typeof modelCOL_Source !== 'undefined' && modelCOL_Source !== null) {

        modelCOL_Source.children.forEach((child) => {
        // model.getObjectByName("Piyomaru_COL").children.forEach((child) => {
            
            let boneName = child.name.replace("Vis_Collide", "");
            
            // Get radius of childmesh
            let radius = 0;
            child.geometry.computeBoundingSphere();
            radius = child.geometry.boundingSphere.radius;
            // radius = child.geometry.boundingSphere.radius * Math.cos(Math.PI / 4);

            // Add bone to trackingBones
            let bone = helper.bones.find((bone) => bone.name === boneName);
            trackingBones.push(bone);

            // Create a sphere for each vertex
            let trackingSphereGeometry = new THREE.SphereGeometry(radius, 16, 8);
            let trackingSphereMesh = new THREE.Mesh(trackingSphereGeometry, trackingSphereMaterial);
            if (boneName.includes('Left')) {
                trackingSphereMesh.material = new THREE.MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
            }
            if (boneName.includes('Right')) {
                trackingSphereMesh.material = new THREE.MeshStandardMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 });
            }
            trackingSphereMesh.name = boneName;
            trackingSphereMesh.radius = radius;
            trackingSphereMesh.position.setFromMatrixPosition(child.matrixWorld);
            trackingSpheres.add(trackingSphereMesh);
        });
    }

    renderSession.input.characters.data[characterIndex].trackingSpheres = trackingSpheres;

    // Reset up material for model 
    const _DEFAULT_MATERIAL = {
        color: 0x000000,
        roughness: 1,
        metalness: 0,
        side: 2,
        transparent: true,
        opacity: 1,
        alphaTest: 0,
        depthWrite: true,
        depthTest: true,
    }

    fbx.traverse((c) => {
        if (c.isMesh) {
            var currentMaterial = c.material;
            currentMaterial = new THREE.MeshStandardMaterial({
                ..._DEFAULT_MATERIAL, 
                color: character.modelColor
            });
            c.material = currentMaterial;

            // Set color for mesh by name
            
            const colorsDefinedByMeshName = renderSession.input.options.colorsDefinedByMeshName;
            if (colorsDefinedByMeshName.enable === "true") {
                colorsDefinedByMeshName.index.forEach(element => {
                    const color = colorsDefinedByMeshName.data[element];
                    if (c.name.toUpperCase().includes(element.toUpperCase())) {
                        c.material = new THREE.MeshStandardMaterial({
                            ...currentMaterial,
                            color
                        });
                    }    
                });
            }


            if (c.name.toUpperCase().includes('COLLIDEBODY') || 
                c.name.toUpperCase().includes('TRANS') ||
                c.name.toUpperCase().includes('VIS')
            ) {
                c.material = new THREE.MeshStandardMaterial({
                    ...currentMaterial,
                    visible: false
                });
            }

            if (c.name.toUpperCase().includes('BACKSIDE')) {
                c.material = new THREE.MeshStandardMaterial({
                    ...currentMaterial,
                    side: 0 
                });
            }
        }
    });
}



export default executeModel;