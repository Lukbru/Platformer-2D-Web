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
    let canvasExist = canvas;
    let canvas2dExist = canv2d;

    let mapData : any;
    let tilesetImage : HTMLImageElement;
    let firstGrid = 1;
    let tileWidth = 16;
    let tileHeight = 16;

    const player = {
      x: 30,
      y: 50,
      verX: 0,
      verY: 0,
      width: tileWidth,
      height: tileHeight *2,
      speed: 2,
      jump: 5,
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

      const blocksLayer = mapData.layers.find((lay:any)=>lay.name.toLowerCase().includes('blocks') && lay.type === 'tilelayer');
      if (!blocksLayer){
        return false
      }
      const index = tileX + ( tileY * blocksLayer.width );
      const tiled = blocksLayer.data[index];

      return tiled !==0;
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
      const rightTile = Math.floor((player.x + player.width -1) / tileWidth);
      const topTile = Math.floor(player.y / tileHeight);
      const bottomTile = Math.floor((player.y + player.height -1) / tileHeight)

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
          if (player.onGround || now - lastGroundedAt < 10){
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
      canvas2dExist.clearRect(0,0,canvasExist.width, canvasExist.height);
      const mapPiexelWidth = mapData.width * tileWidth;
      const mapPiexelHeight = mapData.height * tileHeight;
      const offsetX = (canvasExist.width - mapPiexelWidth) / 2;
      const offsetY = (canvasExist.height - mapPiexelHeight) / 2;

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
            x + offsetX,
            y + offsetY,
            tileWidth,
            tileHeight,
          );
        }
      });

      if (keys['ArrowLeft'] || keys['KeyA']){
        player.verX = -player.speed;
      } else if (keys['ArrowRight'] || keys['KeyD']){
        player.verX = player.speed
      } else {
        player.verX = 0;
      }

      player.verY += 0.3; //gravity
      if (player.verY > 10){
        player.verY = 10
      }

      checkCollisionHorizontal();
      checkCollisionVertical();


      canvas2dExist.fillStyle = 'red';
      canvas2dExist.fillRect(player.x + offsetX, player.y + offsetY, player.width, player.height);

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

      checkInput();
      mainGame();
    }).catch((error)=>{console.error('Failed to load map', error)});
  }, []);

  return (
    <canvas ref={canvasRef} width={800} height={800} className="border solid black" style={{imageRendering:'pixelated'}}/>
  );
}