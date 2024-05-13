import {
  Bounds,
  Coords,
  DomEvent,
  DoneCallback,
  TileLayer,
  TileLayerOptions,
  Util,
} from 'leaflet';
import {
  getTileUrl,
  TileInfo,
  getTilePoints,
  downloadTile,
  saveTile,
  getStoredTile,
  removeTile,
  getTileInfo,
} from './TileManager';

export interface TileLayerOfflineOptions extends TileLayerOptions {
  autosave: boolean;
  maxCacheDays: number;
}

export class TileLayerOffline extends TileLayer {
  _url!: string;

  // @ts-expect-error Property has no initializer: Options are initialized below by extending prototype.
  options: TileLayerOfflineOptions;

  createTile(coords: Coords, done: DoneCallback): HTMLImageElement {
    const tile = document.createElement('img');

    DomEvent.on(tile, 'load', Util.bind(this._tileOnLoad, this, done, tile));
    DomEvent.on(tile, 'error', Util.bind(this._tileOnError, this, done, tile));

    if (this.options.crossOrigin || this.options.crossOrigin === '') {
      tile.crossOrigin =
        this.options.crossOrigin === true ? '' : this.options.crossOrigin;
    }

    tile.alt = '';

    tile.setAttribute('role', 'presentation');
    const tileKey = this._getStorageKey(coords);

    getStoredTile(tileKey).then(async (tileInfo) => {
      const minCreatedAt = new Date().setDate(
        -Math.abs(this.options.maxCacheDays),
      );
      if (tileInfo && tileInfo.createdAt < minCreatedAt) {
        await removeTile(tileKey).catch(() => {});
      } else if (tileInfo) {
        tile.src = URL.createObjectURL(tileInfo.blob);
        done(undefined, tile);
        return;
      }

      if (this.options.autosave) {
        try {
          const blob = await downloadTile(this.getTileUrl(coords));
          tile.src = URL.createObjectURL(blob);
          done(undefined, tile);
          await saveTile(getTileInfo(coords, this._url), blob);
        } catch (e) {
          tile.src = this.getTileUrl(coords);
          done(undefined, tile);
        }
      } else {
        tile.src = this.getTileUrl(coords);
        done(undefined, tile);
      }
    });

    return tile;
  }

  /**
   * get key to use for storage
   * @private
   * @param  {string} url url used to load tile
   * @return {string} unique identifier.
   */
  _getStorageKey(coords: { x: number; y: number; z: number }) {
    return getTileUrl(this._url, {
      ...coords,
      ...this.options,
      // @ts-ignore: Possibly undefined
      s: this.options.subdomains['0'],
    });
  }

  /**
   * Get tileinfo for zoomlevel & bounds
   */
  getTileUrls(bounds: Bounds, zoom: number): TileInfo[] {
    const tiles: TileInfo[] = [];
    const tilePoints = getTilePoints(bounds, this.getTileSize());
    for (let index = 0; index < tilePoints.length; index += 1) {
      const tilePoint = tilePoints[index];
      const data = {
        ...this.options,
        x: tilePoint.x,
        y: tilePoint.y,
        z: zoom + (this.options.zoomOffset || 0),
      };
      tiles.push({
        key: getTileUrl(this._url, {
          ...data,
          s: this.options.subdomains?.[0],
        }),
        url: getTileUrl(this._url, {
          ...data,
          // @ts-ignore: Undefined
          s: this._getSubdomain(tilePoint),
        }),
        z: zoom,
        x: tilePoint.x,
        y: tilePoint.y,
        urlTemplate: this._url,
        createdAt: Date.now(),
      });
    }
    return tiles;
  }
}

TileLayerOffline.prototype.options = Util.extend(
  {},
  (TileLayer as any).prototype.options,
  {
    autosave: false,
    maxCacheDays: 7,
  } satisfies TileLayerOfflineOptions,
);

export function tileLayerOffline(
  url: string,
  options: Partial<TileLayerOfflineOptions>,
) {
  return new TileLayerOffline(url, options);
}

/**  @ts-ignore */
if (window.L) {
  /**  @ts-ignore */
  window.L.tileLayer.offline = tileLayerOffline;
}
