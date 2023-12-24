import * as THREE from 'three';

const animate = () => {

    // if (renderSession.input.isPuppeteer) {
    //     renderSession.renderer.setAnimationLoop(null);
    // }

    requestAnimationFrame(animate);
    // const delta = renderSession.clock.getDelta();
    let delta = renderSession.clock.getDelta();
    let time = renderSession.clock.getElapsedTime();

    if (renderSession.input.isPuppeteer) {
        delta = (1 / parseInt(renderSession.input.options.fps));
        time = time += delta; 
    }
    
    renderSession.input.characters.index.forEach(characterIndex => {
        const character = renderSession.input.characters.data[characterIndex];
        // console.log(character);
        if (character.animations) {
            if (character.animations.mixer) {
                // console.log(delta);
                character.animations.mixer.update(delta);
                renderSession.scene.updateMatrixWorld();
            }
        }
    }); 

    // renderSession.renderer.render(renderSession.scene, renderSession.camera);
    renderSession.composer.render();
    renderSession.controls.update(); 
}

export default animate;