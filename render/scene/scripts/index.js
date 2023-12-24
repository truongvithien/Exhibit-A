
import support from './support/index.js';
import threed from './threed/index.js';

const _DEFAULT_INPUT = './input/input.json';
const _IS_PUPPETEER = navigator.userAgent.indexOf('puppeteer') !== -1;
const _DEBUG_RESOLUTION_WIDTH = 1024, 
    _DEBUG_RESOLUTION_HEIGHT = 1024;

const urlParams = support.getURLParams();
var input; 
if (urlParams.input) {
    input = await fetch(urlParams.input).then(res => res.json());
} else {
    input = await fetch(_DEFAULT_INPUT).then(res => res.json());
}

Promise.all([
    input
]).then(([input]) => {
    if (_IS_PUPPETEER) {
        input.isPuppeteer = true;
    } else {
        input.isPuppeteer = false;
        input.options.resolution = {
            width: _DEBUG_RESOLUTION_WIDTH,
            height: _DEBUG_RESOLUTION_HEIGHT 
        };
    }
    threed.init(input);
    threed.animate();
    threed.executeCharacters().then( () => {
        console.log("fps=", input.options.fps);
        console.log("outputName=", input.outputName);
        threed.prepareRender();
        if (_IS_PUPPETEER) {
            threed.saveFrame(0);
        }
    }); 
});
