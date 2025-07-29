import { useEffect, useState, useRef } from "react";

export default function PlatformerLogic() {
  const [ isGameOver, setIsGameOver ] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const resetCooldown = useRef(false);
  
  const player = useRef({
      x: 90,
      y: 500,
      verX: 0,
      verY: 0,
      width: 16,
      height: 16,
      speed: 1.1,
      jump: 5,
      onGround: false,
  });

  function resetPlayer(){
    Object.assign(player.current, {
        x: 90,
      y: 500,
      verX: 0,
      verY: 0,
      width: 16,
      height: 16,
      speed: 1.1,
      jump: 5,
      onGround: false,
    })
  }

  function loadImages(src : string) : Promise <HTMLImageElement> {
    return new Promise( (accept, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => accept(img);
      img.onerror = () => reject(new Error(`Failed to load image : ${src}`));
    });
  }

  useEffect(()=>{
    const canvas = canvasRef.current;
    if (!canvas){
      return
    }
    const canv2d = canvas.getContext('2d');
    if (!canv2d) {
      return
    }

    canv2d.imageSmoothingEnabled = false;
    const scale = 2;
    let canvasExist = canvas;
    let canvas2dExist = canv2d;

    let mapData : any;
    let tilesetImage : HTMLImageElement;
    let firstGrid = 1;
    let tileWidth = 16;
    let tileHeight = 16;

    let playerRunningLeft: HTMLImageElement;
    let playerRunningRight: HTMLImageElement;
    let playerCurrentAnimation: HTMLImageElement;

    const keys: Record<string, boolean> = {};
    let lastGroundedAt = 0;

    function isSolidTile(tileX: number, tileY: number): boolean {
      if (!mapData){
        return false
      }
      if ( tileX < 0 || tileY < 0 || tileX >= mapData.width || tileY >= mapData.height){
        return false
      }

      const blocksLayer = mapData.layers.filter((lay:any)=>(lay.name.toLowerCase().includes('blocks') || lay.name.toLowerCase().includes('special block')) && lay.type === 'tilelayer');
      if (!blocksLayer){
        return false
      }
      for (const layer of blocksLayer){
      const index = tileX + ( tileY * layer.width );
      const tiled = layer.data[index];
      if (tiled !== 0 ) {
        return true;
      }
      }
      return false;
    }
    function checkCollisionVertical(){
      const p = player.current
      p.x += p.verX;
      const leftTile = Math.floor(p.x / tileWidth);
      const rightTile = Math.floor((p.x + p.width -1) / tileWidth);
      const topTile = Math.floor(p.y / tileHeight);
      const bottomTile = Math.floor((p.y + p.height -1) / tileHeight)

       if (p.verX > 0) {
        for ( let tilesY = topTile; tilesY <= bottomTile; tilesY++){
          if (isSolidTile(rightTile, tilesY)){
            p.x = rightTile * tileWidth - p.width;
            p.verX = 0;
          }}}
      else if (p.verX < 0){
        for ( let tilesY = topTile; tilesY <= bottomTile; tilesY++){
          if (isSolidTile(leftTile, tilesY)){
            p.x = ( leftTile + 1 ) * tileWidth;
            p.verX = 0;
          }}}
    }
    function checkCollisionHorizontal(){
      const p = player.current;
      p.y += p.verY;
      p.onGround = false;
      const leftTile = Math.floor(p.x / tileWidth);
      const rightTile = Math.floor((p.x + p.width -1) / tileWidth);
      const topTile = Math.floor(p.y / tileHeight);
      const bottomTile = Math.floor((p.y + p.height ) / tileHeight)

      if (p.verY > 0) {
        for ( let tilesX = leftTile; tilesX <= rightTile; tilesX++){
          if (isSolidTile(tilesX, bottomTile)){
            p.y = bottomTile * tileHeight - p.height;
            p.verY = 0;
            p.onGround = true;
            lastGroundedAt = performance.now();
          }}}
      else if (p.verY < 0) {
        for ( let tilesX = leftTile; tilesX <= rightTile; tilesX++){
          if (isSolidTile(tilesX, topTile)){
            p.y = ( topTile + 1 ) * tileHeight;
            p.verY = 0;
          }}}
    }

    function checkInput() {
      window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
      if (e.code === 'Space') {
          const p = player.current;
          const now = performance.now();
          if (p.onGround || now - lastGroundedAt < 100){
          p.verY = -p.jump;
          p.onGround = false;
          }
          e.preventDefault();
        }

      if (e.code === 'KeyR' && !resetCooldown.current){
        resetPlayer();
        setIsGameOver(false);
        resetCooldown.current = true;
        setTimeout(()=>{
          resetCooldown.current = false
        }, 1000)
      }
    });

      window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
      });
    }

    let lastFPS = performance.now();

    function mainGame(time = performance.now()){
      if (!mapData || !tilesetImage){
        return
      }
      const p = player.current;

      const delta = (time - lastFPS) / 16.67;
      lastFPS = time;
      
      canvas2dExist.setTransform(1,0,0,1,0,0);
      canvas2dExist.clearRect(0,0,canvasExist.width, canvasExist.height);

      const maxX = mapData.width * tileWidth - canvasExist.width / scale;
      const maxY = mapData.height * tileHeight - canvasExist.height / scale;

      const cameraX = Math.max(0, Math.min(p.x + p.width /2 - canvasExist.width / (2*scale), maxX));
      const cameraY = Math.max(0, Math.min(p.y + p.height /2 - canvasExist.height / (2*scale), maxY));

      const camX = Math.floor(cameraX);
      const camY = Math.floor(cameraY);

      canvas2dExist.setTransform(scale,0,0,scale, -camX*scale, -camY*scale);

      //const mapPiexelWidth = mapData.width * tileWidth;
      //const mapPiexelHeight = mapData.height * tileHeight;
      //const offsetX = (canvasExist.width - mapPiexelWidth) / 2;
      //const offsetY = (canvasExist.height - mapPiexelHeight) / 2;

      mapData.layers.forEach((layer:any)=>{
        if (layer.type !== 'tilelayer'){
          return
        }
        const { width, height, data } = layer;
        for ( let i = 0; i < data.length; i++){
          const id = data[i];
          if (id === 0){
            continue
          }
          const tileId = id - firstGrid;
          if (tileId < 0){
            continue
          }
          const x = (i % width) * tileWidth;
          const y = Math.floor(i/width) * tileHeight;

          const tileSets = tilesetImage.width / tileWidth;
          const dx = (tileId % tileSets) * tileWidth;
          const dy = Math.floor(tileId/tileSets) * tileHeight;

          canvas2dExist.drawImage(
            tilesetImage,
            dx,
            dy,
            tileWidth,
            tileHeight,
            Math.floor(x),
            Math.floor(y),
            tileWidth,
            tileHeight,
          );
        }
      });

      if (keys['ArrowLeft'] || keys['KeyA']){
        p.verX = -p.speed*delta;
        playerCurrentAnimation = playerRunningLeft;
      } else if (keys['ArrowRight'] || keys['KeyD']){
        p.verX = p.speed*delta;
        playerCurrentAnimation = playerRunningRight;
      } else {
        p.verX = 0;
      }
      
      if (!p.onGround){
      p.verY += 0.2*delta; //gravity
      if (p.verY > 10){
        p.verY = 10
      }}else {
        p.verY=0;
      }

      checkCollisionHorizontal();
      checkCollisionVertical();

      if (p.y > (mapData.height*tileHeight)){
        setIsGameOver(true);
      }

      if (!canv2d){
        return
      }

      if (!isGameOver){
        canv2d.fillRect(p.x,p.y,p.width,p.height);
        canv2d.drawImage(playerCurrentAnimation,p.x,p.y,p.width,p.height)
      }


      requestAnimationFrame(mainGame);
    }
    fetch('/world_0_map_0.tmj').then((res)=>res.json()).then(async(map)=>{
      mapData = map;
      const tileset = mapData.tilesets[0];
      firstGrid = tileset.firstgid || 1;
      tileWidth = tileset.tilewidth || 16;
      tileHeight = tileset.tileheight || 16;
      const rawimagePath = tileset.image;
      const imagePath = '/' + rawimagePath.split('/').pop();
      tilesetImage = await loadImages(imagePath);
      playerRunningLeft = await loadImages('animation/running_1.png');
      playerRunningRight = await loadImages('animation/running_2.png');

      playerCurrentAnimation = playerRunningRight;

      checkInput();
      mainGame();
    }).catch((error)=>{console.error('Failed to load map', error)});
    
  }, []);

  return (
    <div style={{display: 'flex', justifyContent: 'center', background:'grey'}}>
    <canvas ref={canvasRef} width={800} height={720} className="border solid black" style={{imageRendering:'pixelated', width:`${600*2}px`, height:`${360*2}`}}/>
    {isGameOver && (
      <div style={{ position:'absolute',background:'rgba(0,0,0,0.7)', color:'white', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', top:0,left:0,right:0,bottom:0}}>
        <h1 style={{fontSize:'48px'}}>Game Over</h1>
        <p style={{fontSize:'24px'}}>Press R to Restart</p>
      </div>
    )}
    </div>
  );
}