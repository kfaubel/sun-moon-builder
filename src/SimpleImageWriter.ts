import * as fs from "fs";
import path from "path";
import { LoggerInterface } from "./Logger";

export interface ImageWriterInterface {
    saveFile(fileName: string, buf: Buffer): void;
}
export class SimpleImageWriter implements ImageWriterInterface {
    private logger: LoggerInterface;
    private directory: string;

    constructor(logger: LoggerInterface, directory: string) {
        this.logger = logger;
        this.directory = directory;

        try {
            fs.mkdirSync(this.directory, { recursive: true });
        } catch (e) {
            this.logger.error(`Failure to create output directory ${this.directory} - ${e}`);
        }
    }

    saveFile(fileName: string, buf: Buffer): void {
        const fullName: string = path.join(this.directory, fileName);
        fs.writeFileSync(fullName, buf);
    }
}