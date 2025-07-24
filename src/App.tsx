import { useEffect, useRef } from "react";

export default function PlatformerLogic() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);


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

    const player = {
      x: 30,
      y: 50,
      verX: 0,
      verY: 0,
      width: tileWidth,
      height: tileHeight,
      speed: 2,
      jump: 6,
      onGround: false,
    };
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
      player.x += player.verX;
      const leftTile = Math.floor(player.x / tileWidth);
      const rightTile = Math.floor((player.x + player.width -1) / tileWidth);
      const topTile = Math.floor(player.y / tileHeight);
      const bottomTile = Math.floor((player.y + player.height -1) / tileHeight)

       if (player.verX > 0) {
        for ( let tilesY = topTile; tilesY <= bottomTile; tilesY++){
          if (isSolidTile(rightTile, tilesY)){
            player.x = rightTile * tileWidth - player.width;
            player.verX = 0;
          }}}
      else if (player.verX < 0){
        for ( let tilesY = topTile; tilesY <= bottomTile; tilesY++){
          if (isSolidTile(leftTile, tilesY)){
            player.x = ( leftTile + 1 ) * tileWidth;
            player.verX = 0;
          }}}
    }
    function checkCollisionHorizontal(){
      player.y += player.verY;
      player.onGround = false;
      const leftTile = Math.floor(player.x / tileWidth);
      const rightTile = Math.floor((player.x + player.width ) / tileWidth);
      const topTile = Math.floor(player.y / tileHeight);
      const bottomTile = Math.floor((player.y + player.height ) / tileHeight)

      if (player.verY > 0) {
        for ( let tilesX = leftTile; tilesX <= rightTile; tilesX++){
          if (isSolidTile(tilesX, bottomTile)){
            player.y = bottomTile * tileHeight - player.height;
            player.verY = 0;
            player.onGround = true;
            lastGroundedAt = performance.now();
          }}}
      else if (player.verY < 0) {
        for ( let tilesX = leftTile; tilesX <= rightTile; tilesX++){
          if (isSolidTile(tilesX, topTile)){
            player.y = ( topTile + 1 ) * tileHeight;
            player.verY = 0;
          }}}
    }

    function checkInput() {
      window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Space') {
          const now = performance.now();
          if (player.onGround || now - lastGroundedAt < 100){
          player.verY = -player.jump;
          player.onGround = false;
          }
          e.preventDefault();
        }
      });
      window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
      });
    }
    function mainGame(){
      if (!mapData || !tilesetImage){
        return
      }
      
      canvas2dExist.setTransform(1,0,0,1,0,0);
      canvas2dExist.clearRect(0,0,canvasExist.width, canvasExist.height);

      const maxX = mapData.width * tileWidth - canvasExist.width / scale;
      const maxY = mapData.height * tileHeight - canvasExist.height / scale;

      const cameraX = Math.max(0, Math.min(player.x + player.width /2 - canvasExist.width / (2*scale), maxX));
      const cameraY = Math.max(0, Math.min(player.y + player.height /2 - canvasExist.height / (2*scale), maxY));

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
        player.verX = -player.speed;
        playerCurrentAnimation = playerRunningLeft;
      } else if (keys['ArrowRight'] || keys['KeyD']){
        player.verX = player.speed
        playerCurrentAnimation = playerRunningRight;
      } else {
        player.verX = 0;
      }

      if (!player.onGround){
      player.verY += 0.3; //gravity
      if (player.verY > 10){
        player.verY = 10
      }}else {
        player.verY=0;
      }

      checkCollisionHorizontal();
      checkCollisionVertical();

      player.onGround = false;

      canvas2dExist.fillRect(player.x, player.y, player.width, player.height);
      canvas2dExist.drawImage(
        playerCurrentAnimation,
        player.x,
        player.y,
        player.width,
        player.height
      )

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
    </div>
  );
}