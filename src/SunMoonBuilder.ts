/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoggerInterface } from "./Logger";
import { KacheInterface } from "./Kache";
import { ImageWriterInterface } from "./SimpleImageWriter";
import { SunMoonImage } from "./SunMoonImage";

export class SunMoonBuilder {
    private logger: LoggerInterface;
    private cache: KacheInterface;
    private writer: ImageWriterInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface, writer: ImageWriterInterface) {
        this.logger = logger;
        this.cache = cache; 
        this.writer = writer;
    }

    public async CreateImages(location: string, fileName: string, lat: string, lon: string, apiKey: string, timeZone: string, dateStr:string): Promise<boolean>{
        try {
            const weatherImage: SunMoonImage = new SunMoonImage(this.logger, this.cache);

            const result = await weatherImage.getImage(location, lat, lon, apiKey, timeZone, dateStr);

            if (result !== null && result.imageData !== null ) {
                this.logger.info(`SunMoonBuilder CreateImages: Writing: ${fileName}`);
                this.writer.saveFile(fileName, result.imageData.data);
            } else {
                this.logger.error("SunMoonBuilder CreateImages: No image returned from weatherImage.getImage");
                return false;
            }
        } catch(e) {
            if (e instanceof Error) {
                this.logger.error(`SunMoonBuilder CreateImages: Exception: ${e.message}`);
                this.logger.error(`${e.stack}`);
            } else {
                this.logger.error(`SunMoonBuilder CreateImages: Exception: ${e}`);
            }
            return false;
        }

        return true;
    }
}
