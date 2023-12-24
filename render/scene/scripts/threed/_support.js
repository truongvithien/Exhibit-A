import * as THREE from 'three';

const generateRetargetOptions = (mocapXML, modelXML) => {

    const cloneMocapXML = mocapXML,
        cloneModelXML = modelXML;
    
    const listMocapJoints = {
        type: 'mocap',
        index: [],
        data: {}
    },
        listModelJoints = {
        type: 'model',
        index: [],
        data: {}
    };
        
    const options = {
        hip: "Hips",
        names: {
        },
        preserveMatrix: true,
        preserveHipPosition: true,
    }

    cloneMocapXML.config_root.match_list[0].item.forEach((item, index) => {
        if (item.$.value) {
            listMocapJoints.index.push(item.$.key);
            listMocapJoints.data[item.$.key] = item.$.value;
        } 
    });

    cloneModelXML.config_root.match_list[0].item.forEach((item, index) => {
        if (item.$.value) {
            listModelJoints.index.push(item.$.key);
            listModelJoints.data[item.$.key] = item.$.value;
        }
    });

    listModelJoints.index.forEach((item, index) => {
        if (listMocapJoints.data[item]) {
            options.names[listMocapJoints.data[item]] = listModelJoints.data[item];
        }
    });

    return options;
}

const getDistance = (vector3D1, vector3D2) => {
    return Math.sqrt(Math.pow(vector3D1.x - vector3D2.x, 2) + Math.pow(vector3D1.y - vector3D2.y, 2) + Math.pow(vector3D1.z - vector3D2.z, 2));
}

const createBox3 = (mesh) => {
    const vector = new THREE.Vector3();
    const box = new THREE.Box3().makeEmpty();
    const position = mesh.geometry.attributes.position;
    for ( let i = 0, il = position.count; i < il; i ++ ) {
        vector.fromBufferAttribute( position, i );
        mesh.boneTransform( i, vector );
        mesh.localToWorld( vector );
        box.expandByPoint( vector );
    }
    return box;
}

const getDistanceBetweenMeshes = (mesh1, mesh2) => {
    const mesh1Box = createBox3(mesh1),
        mesh2Box = createBox3(mesh2);
    
    const mesh1Center = mesh1Box.getCenter(new THREE.Vector3()),
        mesh2Center = mesh2Box.getCenter(new THREE.Vector3());
    
    return getDistance(mesh1Center, mesh2Center);
}

// const retargetOptions = generateRetargetOptions(mocapXML, modelXML);
// console.log(retargetOptions)

const getFBXsOffset = (model, mocap) => {
    const modelSkeleton = model.children[1].skeleton,
        // mocapSkeleton = mocap.children[1].skeleton;
        mocapSkeleton = mocap.skeleton;

    const modelSkeletonHelper = new THREE.SkeletonHelper(model);
    modelSkeletonHelper.skeleton = modelSkeleton;

    const mocapSkeletonHelper = new THREE.SkeletonHelper(mocap);
    mocapSkeletonHelper.skeleton = mocapSkeleton;

    const modelSkeletonHelperBones = modelSkeletonHelper.bones,
        mocapSkeletonHelperBones = mocapSkeletonHelper.bones;

    const offsets = {};

    modelSkeletonHelperBones.forEach((bone, index) => {

        // console.log(bone.name);
        // console.log(mocapSkeletonHelperBones[index].name);

        // mocapSkeletonHelperBones[index].name = bone.name;

        const mocapProportionalBone = mocapSkeletonHelperBones.find((mocapBone) => mocapBone.name.includes(bone.name));
        
        // console.log(mocapProportionalBone);

        if (offsets[bone.name]) return;
        
        offsets[bone.name] = {
            x: bone.position.x - mocapProportionalBone.position.x,
            y: bone.position.y - mocapProportionalBone.position.y,
            z: bone.position.z - mocapProportionalBone.position.z,
        }
    });
    return offsets;
}

function createAnimHash(animations) {

    /* Convert animations: 
        animations: {
            ...
            tracks: [
                ...
                {   
                    name: "...position",
                    values: [x, y, z, x, y, z, ...]
                },
                {   
                    name: "...quaternion",
                    values: [x, y, z, w, x, y, z, w, ...]
                },
                {   
                    name: "...scale",
                    values: [x, y, z, x, y, z, ...]
                },
                (next bone...)
            ]
        }
        To:
        animHash: {
            index: {
                '...': 0
            },
            '...': {
                index: {
                    'position': 0,
                    'quaternion': 1,
                    'scale': 2
                },
                'position': [
                    THREE.Vector3(x, y, z), THREE.Vector3(x, y, z), ...
                ],
                'quaternion': [
                    THREE.Quaternion(x, y, z, w), THREE.Quaternion(x, y, z, w), ...
                ],
                'scale': [
                    THREE.Vector3(x, y, z), THREE.Vector3(x, y, z), ...
                ]
            },
            (next bone...)
        }

    */

    let animHash = {};
    animations.tracks.forEach((track, index) => {

        if (!animHash.index) animHash.index = [];
        animHash.index.push(track.name);

        const trackName = track.name;
        const trackValues = track.values;
        
        const trackCode = trackName.split('.')[0];
        const trackType = trackName.split('.')[1];

        // console.log({
        //     trackName,
        //     trackCode,
        //     trackType,
        //     trackValues
        // });

        if (!animHash[trackCode]) {
            animHash[trackCode] = {};
        }

        animHash[trackCode].index = {
            ...animHash[trackCode].index,
            [trackType]: index
        }

        if (!animHash[trackCode][trackType]) {
            animHash[trackCode][trackType] = [];
        }

        animHash[trackCode][trackType] = [];

        if (trackType === 'quaternion') {
            for (let i = 0; i < trackValues.length; i += 4) {
                animHash[trackCode][trackType].push(new THREE.Quaternion(trackValues[i], trackValues[i + 1], trackValues[i + 2], trackValues[i + 3]));
            }
        } else {
            for (let i = 0; i < trackValues.length; i += 3) {
                animHash[trackCode][trackType].push(new THREE.Vector3(trackValues[i], trackValues[i + 1], trackValues[i + 2]));
            }
        }
        
    });

    // Replace frame 0 with frame 1
    animHash.index.forEach((trackName, index) => {
        const trackCode = trackName.split('.')[0];
        const trackType = trackName.split('.')[1];

        animHash[trackCode][trackType][0] = animHash[trackCode][trackType][1].clone();
    });


    // console.log('animHash: ', animHash);

    return animHash;
}

const composeMatrix = (animHash) => {
    var animHashClone = animHash;
    animHashClone.index.forEach((trackName, index) => {
        const trackCode = trackName.split('.')[0];
        const trackType = trackName.split('.')[1];

        animHashClone[trackCode].matrix = [];
        
        animHashClone[trackCode][trackType].forEach((value, index) => {
            animHashClone[trackCode].matrix[index] = new THREE.Matrix4();
            animHashClone[trackCode].matrix[index].compose(
                animHashClone[trackCode].position[index], 
                animHashClone[trackCode].quaternion[index], 
                animHashClone[trackCode].scale[index]
            );
        });
    });
    return animHashClone;
}

const getBoneParent = (bone, currentList) => {
    if (bone.parent === null) return currentList;
    currentList.push(bone.parent.name);
    return getBoneParent(bone.parent, currentList);
}

const getBoneParentHash = (animHash, skeleton) => {
    var animHashClone = animHash;


    animHashClone.index.forEach((trackName, index) => {
        const trackCode = trackName.split('.')[0];
        const trackType = trackName.split('.')[1];

        const bone = skeleton.bones.find((bone) => bone.name === trackCode);
        const boneParent = getBoneParent(bone, [trackCode]);
        animHashClone[trackCode].parents = boneParent;
    });
    
    return animHashClone;
}

const getWorldPosition = (animHash, trackName, frame, worldMatrix) => {
    const trackValue = animHash[trackName].position[frame];
    // console.log(trackValue);
    const trackParent = animHash[trackName].parents;
    var worldPosition = trackValue.clone();

    // worldPosition.y = 0;

    // if (trackName === 'Hips') {
    //     return worldPosition.applyMatrix4(animHash[trackName].matrix[frame]);
    // }
        
    trackParent.forEach((parentName) => {
        // console.log(`trackName: ${trackName}, parentName: ${parentName}; frame: ${frame}`)
        if (parentName === "" || parentName === "Root" || renderSession.input.characters.index.includes(parentName)) {
            return worldPosition;
            // console.log(typeof worldMatrix);
            // if (typeof worldMatrix == 'undefined') {
            //     return worldPosition;
            // } else {
            //     worldPosition = worldPosition.applyMatrix4(worldMatrix);
            // }
        } else {
            worldPosition = worldPosition.applyMatrix4(animHash[parentName].matrix[frame]);
        }
    });

    // console.log('worldPosition: ', worldPosition);

    return worldPosition;
}

const getAllWorldPosition = (animHash, frame) => {
    var animHashClone = animHash;

    animHash.index.forEach((trackName, index) => {
        const trackCode = trackName.split('.')[0];
        const trackType = trackName.split('.')[1];

        animHashClone[trackCode][trackType][frame] = getWorldPosition(animHash, trackCode, frame);

    });

    return animHashClone;

}

const applyAnimation = (animation, animHash) => {
    var animClone = animation.clone();

    animHash.index.forEach((trackName, index) => {
        const trackCode = trackName.split('.')[0];
        const trackType = trackName.split('.')[1];

        // clean track
        // console.log(animClone);
        // animClone.tracks[index].values = [];

        let trackClones = [];

        animHash[trackCode][trackType].forEach((value, index) => {
            var valueArray = [];
            if (trackType === 'quaternion') {
                valueArray = [value.x, value.y, value.z, value.w];
            } else {
                valueArray = [value.x, value.y, value.z];
            }
            // append to track
            trackClones.push(...valueArray);

        });

        animClone.tracks[index].values = trackClones;
    });

    return animClone;
}

const addSphereTest = ({
    toCloneMesh,
    meshContainer,
    color,
    size,
    position
}) => {
    let cloneMesh = toCloneMesh.clone();
    cloneMesh.geometry = new THREE.SphereGeometry(size, 32, 32);
    cloneMesh.material = new THREE.MeshBasicMaterial({ color });
    cloneMesh.position.copy(position);
    meshContainer.add(cloneMesh);
    return cloneMesh;
} 

const showSphereTest = ({
    listCollideTargets, 
    listCollideSources,
    toCloneMesh,
    meshContainer,
    animHash,
    frameLength,
    worldMatrix
}) => {
    
    // console.log('showSphereTest: ', listCollideTargets, listCollideSources, animHash, frameLength, worldMatrix)

    for (let i = 0; i < frameLength; i++) {


        listCollideTargets.forEach((target) => {
            addSphereTest({
                toCloneMesh,
                meshContainer,
                color: 0x00ff00,
                size: 1,
                position: getWorldPosition(animHash, target, i, worldMatrix),
                name: `${target}_${i}`
            });
        });

        listCollideSources.forEach((source) => {
            addSphereTest({
                toCloneMesh,
                meshContainer,
                color: (source.toUpperCase().includes('LEFT')) ? 0xff0000 : 0x0000ff,
                size: 1,
                position: getWorldPosition(animHash, source, i, worldMatrix),
                name: `${source}_${i}`
            });
        });
    }

}

const adjustAnimation = (animation, fbxsOffset, trackingSpheres, characterIndex, collisionSettings) => new Promise((resolve, reject) => {
    
    var model = renderSession.input.characters.data[characterIndex].model,
        mocap = renderSession.input.characters.data[characterIndex].mocap;

    var headCollideLevel = collisionSettings.headLevel,
        bodyCollideLevel = collisionSettings.bodyLevel,
        colliderReduceRate = collisionSettings.reduceRate,
        colliderReduceFromFrame = collisionSettings.reduceFromFrame;
    
    var animHash = createAnimHash(animation);
    animHash = composeMatrix(animHash);
    animHash = getBoneParentHash(animHash, mocap.skeleton);
    animHash = updateDeltaMovementHash(animHash);

    // console.log('animHash: ', animHash);

    // const listCollideTargets = ["Hips"],
    var listCollideTargets = [],
    listCollideSources = [];

    model.children.find((child) => child.name.toUpperCase().includes('COL_TARGET')).children.forEach((child) => {
        let name = child.name;
        name = name.replace('Vis_Collide', '');
        listCollideTargets.push(name);
    });
    model.children.find((child) => child.name.toUpperCase().includes('COL_SOURCE')).children.forEach((child) => {
        let name = child.name;
        name = name.replace('Vis_Collide', '');
        listCollideSources.push(name);
    });

    // console.log('listCollideTargets: ', listCollideTargets);
    // console.log('listCollideSources: ', listCollideSources);

    // const frameLength = animHash.Hips.position.length;
    // showSphereTest({
    //     toCloneMesh: tmp.children[0],
    //     meshContainer: tmp,
    //     animHash,
    //     frameLength,
    // });

    // console.log(mocap.matrixWorld);

    retargetAnimation(animHash, fbxsOffset).then((animHash_retargeted) => {
        const frameLength = animHash_retargeted.Root.position.length;
        // showSphereTest({
        //     listCollideTargets,
        //     listCollideSources,
        //     toCloneMesh: tmp.children[0],
        //     meshContainer: tmp,
        //     animHash: animHash_retargeted,
        //     frameLength,
        //     worldMatrix: mocap.matrixWorld
        // });
        collidePreventAnimation(trackingSpheres, animHash_retargeted, listCollideTargets, listCollideSources, mocap, headCollideLevel, bodyCollideLevel, colliderReduceRate, colliderReduceFromFrame).then((animHash_collidePrevented) => {
            const appliedAnimation = applyAnimation(animation, animHash_collidePrevented);
            // console.log('animHash_collidePrevented: ', animHash_collidePrevented);
            // console.log('appliedAnimation: ', appliedAnimation);
            resolve(appliedAnimation);
        });

    });
    

    
});

const retargetAnimation = (animHash, fbxOffset) => new Promise((resolve, reject) => {
    var animHashClone = animHash;

    animHashClone.index.forEach((trackName, index) => {
        const trackCode = trackName.split('.')[0];
        const trackType = trackName.split('.')[1];

        // console.log(trackCode, trackType);

        animHashClone[trackCode][trackType].forEach((value, index) => {
            var valueArray = [];
            if (trackType === 'position') {
                valueArray = [value.x, value.y, value.z];
                const retargetedValueArray = [
                    valueArray[0] + fbxOffset[trackCode].x,
                    valueArray[1] + fbxOffset[trackCode].y,
                    valueArray[2] + fbxOffset[trackCode].z,
                ];
                animHashClone[trackCode][trackType][index] = new THREE.Vector3(...retargetedValueArray);
            }
        });
    });
    resolve(animHashClone);
});

const getReduceValue = (colliderReduceRate, last, current, type = 'position') => {
    const reduceRate = colliderReduceRate;
    let newCurrent = current.clone();

    // console.log('last ', last.clone());
    // console.log('current ', current.clone());

    let delta = new THREE.Vector3();
    delta.subVectors(current, last);

    if (type === 'quaternion') {
        delta = new THREE.Quaternion();
        // sub x,y,z ; w keep current
        delta.x = current.x - last.x;
        delta.y = current.y - last.y;
        delta.z = current.z - last.z;
        delta.w = current.w;
    }

    // console.log('delta ', delta)

    // get axis with max value of delta
    let maxAbsAxis = 0,
        maxAbsValue = 0;

    if (Math.abs(delta.x) > maxAbsValue) {
        maxAbsAxis = 0;
        maxAbsValue = Math.abs(delta.x);
    } 
    
    if (Math.abs(delta.y) > maxAbsValue) {
        maxAbsAxis = 1;
        maxAbsValue = Math.abs(delta.y);
    } 
    
    if (Math.abs(delta.z) > maxAbsValue) {
        maxAbsAxis = 2;
        maxAbsValue = Math.abs(delta.z);
    }

    // console.log('maxAbsAxis ', maxAbsAxis, 'maxAbsValue ', maxAbsValue);

    switch (maxAbsAxis) {
        case 0:
            newCurrent.x = newCurrent.x - delta.x * reduceRate;
            break;
        case 1:

            newCurrent.y = newCurrent.y - delta.y * reduceRate;
            break;
        case 2:
            newCurrent.z = newCurrent.z - delta.z * reduceRate;
            break;
        default:
            break;
    }
    
    // console.log('newCurrent ', newCurrent.clone());

    return newCurrent;

    

};

const collidePreventAnimation = (trackingSpheres, animHash, collideTargets, collideSources, mocap, headCollideLevel, bodyCollideLevel, colliderReduceRate, colliderReduceFromFrame) => new Promise((resolve, reject) => {


    // console.log(headCollideLevel, bodyCollideLevel, colliderReduceRate, colliderReduceFromFrame);

    const listRadius = {};
    collideTargets.forEach((target) => {
        listRadius[target] = trackingSpheres.children.find((sphere) => sphere.name.includes(target)).radius;
    });
    collideSources.forEach((source) => {
        listRadius[source] = trackingSpheres.children.find((sphere) => sphere.name.includes(source)).radius;
    });

    var animHashClone = animHash;
    const frameLength = animHashClone.Hips.position.length;

    var worldMatrix = new THREE.Matrix4();
    worldMatrix = mocap.matrixWorld;

    for (let i = colliderReduceFromFrame; i < frameLength; i++) {
        collideTargets.forEach((target) => {
            collideSources.forEach((source) => {
                const sourcePos = getWorldPosition(animHashClone, source, i, worldMatrix);
                const targetPos = getWorldPosition(animHashClone, target, i, worldMatrix);
                const distance = getDistance(sourcePos, targetPos);
                const sumRadius = listRadius[source] + listRadius[target];

                if (distance < sumRadius)
                    // if (target)
                    // console.log({
                    //     frame: i,
                    //     source: {source, sourcePos},
                    //     target: {target, targetPos},
                    //     distance,
                    //     sumRadius,
                    // })

                // console.log()

                if (distance < sumRadius && i > 0) {

                    // getReduceValue(animHashClone, targetPos, sourcePos, i).then((reducedValue) => {
                    //     animHashClone = reducedValue;
                    // }

                    // const reducedValue = getReduceValue(animHashClone, targetPos, sourcePos, i);

                    // console.log(`collide: ${source} -> ${target} at frame ${i}`);

                    const parents = animHashClone[source].parents;
                    var collideLvl = parseInt(bodyCollideLevel);

                    if (target.toUpperCase().includes('HEAD')) { 
                        collideLvl = parseInt(headCollideLevel);
                    } else {
                        collideLvl = parseInt(bodyCollideLevel);
                    }

                    // console.log('collideLvl: ', collideLvl)

                    for (let j = 0; j < parents.length; j++) {
                        if (j < collideLvl && parents[j] !== "") {

                            animHashClone[parents[j]].position[i] = getReduceValue(
                                colliderReduceRate,
                                animHashClone[parents[j]].position[i - 1].clone(),
                                animHashClone[parents[j]].position[i].clone()
                            );

                            animHashClone[parents[j]].quaternion[i] = getReduceValue(
                                colliderReduceRate,
                                animHashClone[parents[j]].quaternion[i - 1].clone(),
                                animHashClone[parents[j]].quaternion[i].clone(),
                                'quaternion'
                            );


                            animHashClone[parents[j]].scale[i] = getReduceValue(
                                colliderReduceRate,
                                animHashClone[parents[j]].scale[i - 1].clone(),
                                animHashClone[parents[j]].scale[i].clone()
                            );


                            // animHashClone[parents[j]].position[i] = animHashClone[parents[j]].position[i - 1].clone();
                            animHashClone[parents[j]].quaternion[i] = animHashClone[parents[j]].quaternion[i - 1].clone();
                            animHashClone[parents[j]].scale[i] = animHashClone[parents[j]].scale[i - 1].clone();
                        }
                    }



                    // animHashClone[parents[1]].position[i] = animHashClone[parents[1]].position[i - 1].clone();
                    // animHashClone[parents[1]].quaternion[i] = animHashClone[parents[1]].quaternion[i - 1].clone();
                    // animHashClone[parents[1]].scale[i] = animHashClone[parents[1]].scale[i - 1].clone();

                    // animHashClone[parents[1]].position[i] = animHashClone[parents[1]].position[i - 1].clone();
                    // animHashClone[parents[1]].quaternion[i] = animHashClone[parents[1]].quaternion[i - 1].clone();
                    // animHashClone[parents[1]].scale[i] = animHashClone[parents[1]].scale[i - 1].clone();

                    // animHashClone[parents[2]].position[i] = animHashClone[parents[2]].position[i - 1].clone();
                    // animHashClone[parents[2]].quaternion[i] = animHashClone[parents[2]].quaternion[i - 1].clone();
                    // animHashClone[parents[2]].scale[i] = animHashClone[parents[2]].scale[i - 1].clone();

                    // animHashClone[parents[3]].position[i] = animHashClone[parents[3]].position[i - 1].clone();
                    // animHashClone[parents[3]].quaternion[i] = animHashClone[parents[3]].quaternion[i - 1].clone();
                    // animHashClone[parents[3]].scale[i] = animHashClone[parents[3]].scale[i - 1].clone();

                    // animHashClone[source].parents.forEach((parentName) => {
                    //     if (parentName === "") {
                    //         return;
                    //     } else {
                    //         animHashClone[parentName].position[i] = animHashClone[parentName].position[i - 1].clone();
                    //         animHashClone[parentName].quaternion[i] = animHashClone[parentName].quaternion[i - 1].clone();
                    //         animHashClone[parentName].scale[i] = animHashClone[parentName].scale[i - 1].clone();
                    //     }
                    // });


                }
            });
        });
    }


    resolve(animHashClone);

});

const getObjectHeight = (object) => {
    const box = new THREE.Box3().setFromObject(object);
    return box.max.y - box.min.y;
}

const updateDeltaMovementHash = (animHash, fastThreshold = 0, slowThreshold = 1) => {
    const animHashClone = animHash;
    animHashClone.index.forEach((trackName, index) => {
        const trackCode = trackName.split('.')[0];
        const trackType = trackName.split('.')[1];

        animHashClone[trackCode].deltaMovement = [];
        animHashClone[trackCode].isFasts = [];
        animHashClone[trackCode].isSlows = [];

        var maxMovement = 0, minMovement = 100;

        animHashClone[trackCode][trackType].forEach((value, index) => {
            if (index > 0) {
                // Get distance between current and last frame
                const distance = getDistance(value, animHashClone[trackCode][trackType][index - 1]);
                animHashClone[trackCode].deltaMovement.push(distance);
                // Get max and min movement
                if (distance > maxMovement) maxMovement = distance;
                if (distance < minMovement) minMovement = distance;

                // is fasts
                if (distance > fastThreshold) animHashClone[trackCode].isFasts.push(1);
                else animHashClone[trackCode].isFasts.push(0);
                // is slows
                if (distance < slowThreshold) animHashClone[trackCode].isSlows.push(1);
                else animHashClone[trackCode].isSlows.push(0);
                
            }
        });

        animHashClone[trackCode].maxMovement = maxMovement;
        animHashClone[trackCode].minMovement = minMovement;
    });
    return animHashClone;
}

const mergeFrames = (animHash, mergeFromFrame, mergeToFrame) => {

    // This function will merge frames from mergeFromFrame to mergeToFrame into one frame as average of all frames in between

    const animHashClone = animHash;

    animHashClone.index.forEach((trackName, index) => {
        const trackCode = trackName.split('.')[0];
        const trackType = trackName.split('.')[1];

        animHashClone[trackCode][trackType].forEach((value, index) => {
            if (index > mergeFromFrame && index < mergeToFrame) {
                // Get distance between current and last frame
                const distance = getDistance(value, animHashClone[trackCode][trackType][index - 1]);
                animHashClone[trackCode].deltaMovement.push(distance);
            }
        });
    });

}

const addFrame = (animHash, frame) => {


}

export {
    generateRetargetOptions,
    getFBXsOffset,
    adjustAnimation,
    getObjectHeight,
    getDistanceBetweenMeshes,
}