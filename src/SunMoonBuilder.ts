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
                this.logger.info(`CreateImages: Writing: ${fileName}`);
                this.writer.saveFile(fileName, result.imageData.data);
            } else {
                this.logger.error("CreateImages: No imageData returned from weatherImage.getImage");
                return false;
            }
        } catch (e: any) {
            this.logger.error(`CreateImages: Exception: ${e.stack}`);
            return false;
        }

        return true;
    }
}
