import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { getObjectHeight } from './_support.js';

import executeModel from './_execute_model.js';
import executeMocap from './_execute_mocap.js';

const executeCharacters = () => {
    return new Promise((resolve, reject) => {

        const characters = renderSession.input.characters;
        const promises = [];

        characters.index.forEach((characterIndex) => {
            const character = characters.data[characterIndex];
            if (character.modelSrc) {
                const loader = new FBXLoader();
                promises.push(new Promise((resolve, reject) => {
                    loader.load(character.modelSrc, (fbx) => {
                        executeModel({
                            characterIndex,
                            fbx
                        });
                        resolve();
                    });
                }));
            }
            if (character.mocapSrc) {
                const loader = new FBXLoader();
                promises.push(new Promise((resolve, reject) => {
                    loader.load(character.mocapSrc, (fbx) => {
                        executeMocap({
                            characterIndex,
                            fbx
                        });
                        resolve();
                    });
                }));
            }

        });

        Promise.all(promises).then(() => {
            resolve();
        }).catch((error) => {
            reject(error);
        });

    });

}

export default executeCharacters;