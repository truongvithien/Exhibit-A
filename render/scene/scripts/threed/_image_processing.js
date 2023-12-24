const imageProcessing = {
    createCanvas: (width, height, canvasName = "Untitled") => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        // add canvas to .canvas_wrapper and add .canvas_wrapper into #support
        const canvasWrapper = document.createElement('div');
        canvasWrapper.classList.add('canvas_wrapper');
        canvasWrapper.appendChild(canvas);
        // add data-name attribute to canvas
        canvasWrapper.dataset.name = canvasName;
        document.getElementById('support').appendChild(canvasWrapper);

        return canvas;
    },
    canvasToBase64: (canvas) => {
        return canvas.toDataURL(); 
    },
    addImageToCanvas: (canvas, image) => new Promise((resolve, reject) => {
        // This function can use with image url and url data (base64)
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = image;
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            resolve();
        }
    }),
    blurCanvas: (canvas, blur) => {
        const ctx = canvas.getContext('2d');
        ctx.filter = `blur(${blur}px)`;
    },
    addMaskedBlurToCanvas: (canvas, blurCanvas, blurIntensity, blurMapSrc) => new Promise((resolve, reject) => {
        
        const blurCtx = blurCanvas.getContext('2d');
        const img = new Image();
        img.src = blurMapSrc;
        img.onload = () => {
            blurCtx.drawImage(img, 0, 0, blurCanvas.width, blurCanvas.height);
            const ctx = canvas.getContext('2d');
            blurCtx.filter = `blur(${blurIntensity}px)`;
            blurCtx.globalCompositeOperation = 'source-over';
            blurCtx.drawImage(img, 0, 0, blurCanvas.width, blurCanvas.height);
            blurCtx.globalCompositeOperation = 'source-in';
            blurCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
            ctx.drawImage(blurCanvas, 0, 0, blurCanvas.width, blurCanvas.height);
            resolve();
        }
    }),
    addTileToCanvas: (canvas, tileCount, image) => new Promise((resolve, reject) => {
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = canvas.width / tileCount;
        tileCanvas.height = canvas.height / tileCount;
        const tileCtx = tileCanvas.getContext('2d');

        const tileWidth = tileCanvas.width;
        const tileHeight = tileCanvas.height;

        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = image;
        img.onload = () => {
            tileCtx.drawImage(img, 0, 0, tileWidth, tileHeight);
            ctx.fillStyle = ctx.createPattern(tileCanvas, 'repeat');
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            resolve();
        }
    })
}

export default imageProcessing;