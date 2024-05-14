import { Bounds, Point, Map as LMap, Coords } from 'leaflet';
import { TileLayerOffline, tileLayerOffline } from '../src/TileLayerOffline';
import { getStoredTile, saveTile, truncate } from '../src/TileManager';

// Leaflet test helper from
// https://github.com/Leaflet/Leaflet/blob/f46286311a7e3bc691034a349edf765e8b14f71a/spec/suites/SpecHelper.js
function createContainer(width = '400px', height = '400px') {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '0px';
  container.style.left = '0px';
  container.style.height = height;
  container.style.width = width;
  container.style.opacity = '0.4';
  document.body.appendChild(container);

  return container;
}

// Leaflet test helper from
// https://github.com/Leaflet/Leaflet/blob/f46286311a7e3bc691034a349edf765e8b14f71a/spec/suites/layer/tile/TileLayerSpec.js#L181
function eachImg(layer: any, callback: any) {
  const imgtags = layer._container.children[0].children;
  // eslint-disable-next-line no-restricted-syntax
  for (const i in imgtags) {
    if (imgtags[i].tagName === 'IMG') {
      callback(imgtags[i]);
    }
  }
}

const testTileInfo = {
  key: 'http://tile.openstreetmap.org/16/42052/0.png',
  url: 'http://tile.openstreetmap.org/16/42052/0.png',
  x: 42052,
  y: 0,
  z: 16,
  urlTemplate: 'http://tile.openstreetmap.org/{z}/{x}/{y}.png',
  createdAt: Date.now(),
};

describe('TileLayer.Offline', () => {
  it('createTile', () => {
    const url = 'http://a.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const layer = new TileLayerOffline(url);
    // @ts-ignore
    const tile = layer.createTile({ x: 123456, y: 456789, z: 16 }, () => {});
    assert.instanceOf(tile, HTMLElement);
  });
  it('get storagekey openstreetmap', () => {
    const layer = new TileLayerOffline(
      'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    );
    const key = layer._getStorageKey({ z: 16, x: 123456, y: 456789 });
    assert.equal(key, 'http://a.tile.openstreetmap.org/16/123456/456789.png');
  });
  it('get storagekey cartodb', () => {
    const layer = new TileLayerOffline(
      'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
    );
    const key = layer._getStorageKey({ z: 16, x: 123456, y: 456789 });
    assert.equal(
      key,
      'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/16/123456/456789.png',
    );
  });
  it('get storagekey mapbox with accessToken', () => {
    const layer = new TileLayerOffline(
      'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
      {
        id: 'mapbox.streets',
        accessToken: 'xyz',
      },
    );
    const key = layer._getStorageKey({ z: 16, x: 123456, y: 456789 });
    assert.equal(
      key,
      'https://api.tiles.mapbox.com/v4/mapbox.streets/16/123456/456789.png?access_token=xyz',
    );
  });
  it('calculates tiles at level 16', () => {
    const layer = new TileLayerOffline(
      'http://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
    );
    const bounds = new Bounds(
      new Point(8621975, 5543267.999999999),
      new Point(8621275, 5542538),
    );
    const tiles = layer.getTileUrls(bounds, 16);
    assert.lengthOf(tiles, 16);
    const urls = tiles.map((t) => t.url);
    assert.include(urls, 'http://a.tile.openstreetmap.org/16/33677/21651.png');
    const keys = tiles.map((t) => t.key);
    assert.include(keys, 'http://a.tile.openstreetmap.org/16/33677/21651.png');
  });

  it('calculates tile urls,keys at level 16 with subdomains', () => {
    const layer = new TileLayerOffline(
      'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    );
    const bounds = new Bounds(
      new Point(8621975, 5543267.999999999),
      new Point(8621275, 5542538),
    );
    const tiles = layer.getTileUrls(bounds, 16);
    assert.lengthOf(tiles, 16);
    const urls = tiles.map((t) => t.url.replace(/[abc]\./, ''));
    assert.include(urls, 'http://tile.openstreetmap.org/16/33677/21651.png');
    const keys = tiles.map((t) => t.key);
    assert.include(keys, 'http://a.tile.openstreetmap.org/16/33677/21651.png');
  });

  it('uses subdomains for url and not for key', () => {
    const layer = new TileLayerOffline(
      'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    );
    const bounds = new Bounds(
      new Point(8621975, 5543267.999999999),
      new Point(8621275, 5542538),
    );
    const tiles = layer.getTileUrls(bounds, 16);
    const subs = tiles.map((t) => t.url.match(/([abc])\./)?.[1]);
    assert.include(subs, 'a');
    assert.include(subs, 'b');
    assert.include(subs, 'c');
    const subskeys = tiles.map((t) => t.key.match(/([abc])\./)?.[1]);
    assert.include(subskeys, 'a');
    assert.notInclude(subskeys, 'b');
    assert.notInclude(subskeys, 'c');
  });

  it('calculates openstreetmap tiles at level 16', () => {
    const layer = new TileLayerOffline(
      'http://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
    );
    const bounds = new Bounds(
      new Point(8621975, 5543267.999999999),
      new Point(8621275, 5542538),
    );
    const tiles = layer.getTileUrls(bounds, 16);
    assert.lengthOf(tiles, 16);
    const urls = tiles.map((t) => t.url);
    assert.include(urls, 'http://a.tile.openstreetmap.org/16/33677/21651.png');
    const keys = tiles.map((t) => t.key);
    assert.include(keys, 'http://a.tile.openstreetmap.org/16/33677/21651.png');
  });

  it('calculates mobox tiles at level 16', () => {
    const layer = new TileLayerOffline(
      'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
      {
        id: 'mapbox.streets',
        accessToken: 'xyz',
      },
    );
    const bounds = new Bounds(
      new Point(8621975, 5543267.999999999),
      new Point(8621275, 5542538),
    );
    const tiles = layer.getTileUrls(bounds, 16);
    assert.lengthOf(tiles, 16);
    const urls = tiles.map((t) => t.url);
    assert.include(
      urls,
      'https://api.tiles.mapbox.com/v4/mapbox.streets/16/33677/21651.png?access_token=xyz',
    );
    const keys = tiles.map((t) => t.key);
    assert.include(
      keys,
      'https://api.tiles.mapbox.com/v4/mapbox.streets/16/33677/21651.png?access_token=xyz',
    );
  });

  it('saves tiles and renders img tags with blob src', (done) => {
    const container = createContainer();
    const map = new LMap(container);
    container.style.width = '100px';
    container.style.height = '100px';
    map.setView([33677, 21651], 16);

    const layer = tileLayerOffline(
      'http://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        autosave: true,
      },
    ).addTo(map);

    layer.on('load', () => {
      if (!layer.isLoading()) {
        eachImg(layer, (img: any) => {
          expect(img.src).to.contain('blob:');
        });
        done();
      }
    });
  });

  it('uses cached tile', async () => {
    const layer = tileLayerOffline(
      'http://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        autosave: true,
      },
    );
    const agedTestTileInfo = {
      ...testTileInfo,
      createdAt: new Date().setDate(-4),
    };
    const testTileRecord = { agedTestTileInfo, blob: new Blob() };
    await truncate();
    await saveTile(agedTestTileInfo, testTileRecord.blob);

    const { x, y, z } = agedTestTileInfo;
    layer.createTile({ x, y, z } as Coords, () => {});

    await new Promise((resolve) => {
      setTimeout(async () => {
        const stored = await getStoredTile(testTileInfo.key);
        assert.exists(stored);
        assert.equal(stored?.createdAt, agedTestTileInfo.createdAt);
        resolve(null);
      }, 20);
    });
  });
});
