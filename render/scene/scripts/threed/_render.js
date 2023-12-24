
const prepareRender = () => {
    // get min frameCount
    var minFrameCount = 0;
    renderSession.input.characters.index.forEach(characterIndex => {
        const character = renderSession.input.characters.data[characterIndex];
        if (character.mocapSrc) {
            const frameCount = character.frameCount;
            console.log('frameCount', frameCount);
            if (frameCount < minFrameCount || minFrameCount === 0) {
                renderSession.input.framesToRender = frameCount;
                minFrameCount = frameCount;
            }
        }
    }
    );

    console.log('prepareRender', renderSession.input.framesToRender);

    // renderSession.input.framesToRender = 100;
}

const update = () => {
     
}

const oneTime = true;
const saveFrame = async (frame) => {
    update();
    const img = renderSession.renderer.domElement.toDataURL();
    console.log(frame);

    const body = JSON.stringify({ img, frame });
    await fetch('http://localhost:5402', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
    }).catch(err => console.error(err));

    if (frame > renderSession.input.framesToRender) {
        console.log('DONE');
    }

    saveFrame(frame + 1);
}

export  {prepareRender, saveFrame};