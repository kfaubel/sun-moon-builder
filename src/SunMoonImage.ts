/* eslint-disable @typescript-eslint/no-unused-vars */
import jpeg from "jpeg-js";
import fs, { stat } from "fs";
import path from "path";
import * as pure from "pureimage";
import { SunMoonData, SunMoonJson } from "./SunMoodData";
import { LoggerInterface } from "./Logger";

export interface ImageResult {
    imageType: string;
    imageData: jpeg.BufferRet | null;
}

export class SunMoonImage {
    private logger: LoggerInterface;

    constructor(logger: LoggerInterface) {
        this.logger = logger;
    }

    // This optimized fillRect was derived from the pureimage source code: https://github.com/joshmarinacci/node-pureimage/tree/master/src
    // To fill a 1920x1080 image on a core i5, this saves about 1.5 seconds
    // img        - image - it has 3 properties height, width and data
    // x, y       - position of the rect
    // w, h       - size of the rect
    // rgb        - must be a string in this form "#112233"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private myFillRect(img: any, x: number, y: number, w: number, h: number, rgb: string) {
        const colorValue = parseInt(rgb.substring(1), 16);

        // the shift operator forces js to perform the internal ToUint32 (see ecmascript spec 9.6)
        //colorValue = colorValue >>> 0;
        const r = (colorValue >>> 16) & 0xFF;
        const g = (colorValue >>> 8)  & 0xFF;  
        const b = (colorValue)        & 0xFF;
        const a = 0xFF;

        for(let i = y; i < y + h; i++) {                
            for(let j = x; j < x + w; j++) {   
                const index = (i * img.width + j) * 4;   
                
                img.data[index + 0] = r;
                img.data[index + 1] = g;     
                img.data[index + 2] = b;     
                img.data[index + 3] = a; 
            }
        }
    }

    public async getImage(location: string, lat: string, lon: string, apiKey: string, dateStr: string = "") : Promise<ImageResult | null> {
        const title = `Sunrise & Sunset for ${location}`;
        
        const sunMoonData: SunMoonData = new SunMoonData(this.logger);

        const sunMoonJson: SunMoonJson | null = await  sunMoonData.getSunMoonData(lat, lon, apiKey, dateStr);

        if (sunMoonJson === null) {
            this.logger.warn("SunMoonImage: Failed to get data, no image available.\n");
            return null;
        }

        const imageHeight              = 1080; 
        const imageWidth               = 1920; 

        const backgroundColor          = "#E0E0F0";              // format needed by myFillRect
        const circleColor              = "#B0B0B0";
        const sunArcColor              = "#FCD303";
        const sunUpColor               = "#FDF000";
        const sunDownColor             = "#D1AF02";
        const sunTwilightArcColor1     = "#FC9002";
        const sunTwilightArcColor2     = "#FC0C02";
        const sunTwilightArcColor3     = "#9E065C";
        const moonArcColor             = "#808080";
        const moonUpColor              = "#D0D0D0";
        const moonDownColor            = "#808080";
        const titleColor               = "#2020F0"; 
        const labelColor               = "#2020F0";
        
        const textColor                = "rgb(42,  160,  210)";  //"rgb(40,  200,  80)"; 
        const arrowColor               = "rgb(255, 0,    0)";
        const alertColor               = "rgb(200, 0,    0)";
        
        // Approximation of the height of a capital letter
        const largeFontCharHeight       = 54;
        const mediumFontCharHeight      = 40;
        const smallFontCharHeight       = 30;
        const xsmallFontCharHeight      = 22;

        const largeFont                 = "72px 'OpenSans-Bold'";     // Title
        const mediumFont                = "60px 'OpenSans-Regular";   // Other text
        const smallFont                 = "40px 'OpenSans-Regular'";  // Note at the bottom
        const extraSmallFont            = "30px 'OpenSans-Regular'";  // Note at the bottom

        // When used as an npm package, fonts need to be installed in the top level of the main project
        const fntBold     = pure.registerFont(path.join(".", "fonts", "OpenSans-Bold.ttf"),"OpenSans-Bold");
        const fntRegular  = pure.registerFont(path.join(".", "fonts", "OpenSans-Regular.ttf"),"OpenSans-Regular");
        const fntRegular2 = pure.registerFont(path.join(".", "fonts", "alata-regular.ttf"),"alata-regular");
        
        fntBold.loadSync();
        fntRegular.loadSync();
        fntRegular2.loadSync();

        const titleY                    = 90; // down from the top of the image

        // +---+---+
        // | 1 | 2 +
        // +---+---+
        // | 3 | 4 +
        // +---+---+
        const quad1LabelX               = 400;
        const quad1LabelY               = 350;
        const quad2LabelX               = 1350;
        const quad2LabelY               = 350;
        const quad3LabelX               = 400;
        const quad3LabelY               = 700;
        const quad4LabelX               = 1350;
        const quad4LabelY               = 700;

        const img = pure.make(imageWidth, imageHeight);
        const ctx = img.getContext("2d");

        // Fill the background
        ctx.fillStyle = backgroundColor;
        //ctx.fillRect(0, 0, imageWidth, imageHeight);
        this.myFillRect(img, 0, 0, imageWidth, imageHeight, backgroundColor);

        // Draw the title
        ctx.fillStyle = titleColor;
        ctx.font = largeFont;
        const textWidth: number = ctx.measureText(title).width;
        ctx.fillText(title, (imageWidth - textWidth) / 2, titleY);

        
        
        // Draw the labels
        // ctx.fillStyle = textColor;
        // ctx.font = mediumFont;
        // ctx.fillText("Outside Temp",       labelX,       outsideTempY);
        // ctx.font = largeFont;
        //
        // let width: number; // Used multiple times below
        // width = ctx.measureText(windSpeedStr).width; 
        // ctx.fillText(windSpeedStr,  windCenterX - width/2,       windCenterY + (largeFontCharHeight/2 - 42) );
        
        // Draw the graphic
        const centerX = imageWidth/2;
        const centerY = imageHeight/2 + 40;
        const sunRadius   = imageHeight/3; //360
        const moonRadius  = imageHeight/4; //270

        ctx.strokeStyle = circleColor;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, sunRadius, 0, 2 * Math.PI); // Pure 0.3.5 warns on this
        ctx.stroke();

        ctx.strokeStyle = circleColor;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, moonRadius, 0, 2 * Math.PI); // Pure 0.3.5 warns on this
        ctx.stroke();

        
        

        ctx.font = smallFont;
        ctx.fillStyle = circleColor; //titleColor;
        ctx.fillText("12 PM", centerX - (ctx.measureText("12 PM").width/2),                  centerY - (sunRadius                       + 50));
        ctx.fillText("12 AM", centerX - (ctx.measureText("12 AM").width/2),                  centerY + (sunRadius + smallFontCharHeight + 50));
        ctx.fillText("6 AM",  centerX - (sunRadius  + (ctx.measureText("6 AM").width) + 60), centerY + (smallFontCharHeight/2));
        ctx.fillText("6 PM",  centerX + (sunRadius  +                                 + 60), centerY + (smallFontCharHeight/2));

        ctx.save();

        // Change our reference to the center of the wind circle
        ctx.translate(centerX, centerY);
        
        // Draw the minor tick marks
        ctx.lineCap = "round";
        ctx.lineWidth = 2;
        for (let i = 0; i < 360; i += 15) {
            ctx.rotate(15 * Math.PI/180);
            ctx.beginPath();
            ctx.moveTo(sunRadius - 20, 0);
            ctx.lineTo(sunRadius + 20, 0);
            ctx.stroke();
        }

        // Draw the major tick marks
        ctx.lineWidth = 8;
        for (let i = 0; i < 360; i += 90) {
            ctx.rotate(90 * Math.PI/180);
            ctx.beginPath();
            ctx.moveTo(sunRadius - 25, 0);
            ctx.lineTo(sunRadius + 25, 0);
            ctx.stroke();
        }

        ctx.restore();
        

        // SunMoonJson
        //     "sunrise": "06:20",
        //     "sunset": "19:04",
        const sunriseAngle     = this.getAngle(sunMoonJson.sunrise);
        const sunsetAngle      = this.getAngle(sunMoonJson.sunset);
        const moonriseAngle    = this.getAngle(sunMoonJson.moonrise);
        const moonsetAngle     = this.getAngle(sunMoonJson.moonset);
        const currentTimeAngle = this.getAngle(sunMoonJson.current_time); // Current time is "08:21:14.988" but getAngle only uses hh & mm

        // Draw the sun up arc
        ctx.lineWidth = 20;
        ctx.strokeStyle = sunArcColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, sunRadius, this.getRenderAngle(sunriseAngle), this.getRenderAngle(sunsetAngle)); // Pure 0.3.5 warns on this
        ctx.stroke();

        ctx.lineWidth = 20;
        


        // Create gradient
        var grad = ctx.createLinearGradient(0,0,200,0);
        grad.addColorStop(0, "#00ff00");
        grad.addColorStop(1, "#0000ff");
        // Fill with gradient
        ctx.strokeStyle = grad;
        ctx.lineWidth = 10;
        //ctx.strokeRect(10,10,150,80);

        // ctx.beginPath();
        // ctx.moveTo(centerX + sunRadius, centerY);
        // ctx.lineTo(centerX, centerY + sunRadius);
        // ctx.stroke();



      
        // strokeRect and arc work
        // lineTo does NOT work




        
        try {
        
            //ctx.imageSmoothingEnabled = false;
            var grad = ctx.createLinearGradient(centerX + sunRadius, centerY, centerX, centerY + sunRadius);
            grad.addColorStop(0, "#00ff00");
            grad.addColorStop(1, "#0000ff");
            ctx.strokeStyle = grad;

            ctx.beginPath();
            ctx.moveTo(centerX + sunRadius, centerY);
            ctx.lineTo(centerX, centerY + sunRadius);
            ctx.stroke();

            ctx.beginPath();
	        ctx.arc(centerX, centerY, sunRadius + 50, 0, 0.5 * Math.PI);
	        ctx.stroke();
            
            // Draw arc.
            ctx.beginPath();
            //ctx.strokeStyle = grad;
            ctx.lineWidth = 50;
            ctx.arc(centerX, centerY, sunRadius, this.getRenderAngle(sunsetAngle), this.getRenderAngle(sunsetAngle + 30));
            ctx.stroke();
        } catch (e) {
            this.logger.error("fault");
        }

        // Draw twilight 6 degrees before sunrise and 6 degrees after sunset
        // ctx.strokeStyle = sunTwilightArcColor3;
        // ctx.beginPath();
        // ctx.arc(centerX, centerY, sunRadius, this.getRenderAngle(sunriseAngle - 6), this.getRenderAngle(sunriseAngle - 4)); // Pure 0.3.5 warns on this
        // ctx.stroke();

        // ctx.strokeStyle = sunTwilightArcColor2;
        // ctx.beginPath();
        // ctx.arc(centerX, centerY, sunRadius, this.getRenderAngle(sunriseAngle - 4), this.getRenderAngle(sunriseAngle - 2)); // Pure 0.3.5 warns on this
        // ctx.stroke();

        // ctx.strokeStyle = sunTwilightArcColor1;
        // ctx.beginPath();
        // ctx.arc(centerX, centerY, sunRadius, this.getRenderAngle(sunriseAngle - 2), this.getRenderAngle(sunriseAngle)); // Pure 0.3.5 warns on this
        // ctx.stroke();

        // ctx.strokeStyle = sunTwilightArcColor1;
        // ctx.beginPath();
        // ctx.arc(centerX, centerY, sunRadius, this.getRenderAngle(sunsetAngle),      this.getRenderAngle(sunsetAngle + 2)); // Pure 0.3.5 warns on this
        // ctx.stroke();

        // ctx.strokeStyle = sunTwilightArcColor2;
        // ctx.beginPath();
        // ctx.arc(centerX, centerY, sunRadius, this.getRenderAngle(sunsetAngle + 2), this.getRenderAngle(sunsetAngle + 4)); // Pure 0.3.5 warns on this
        // ctx.stroke();

        // ctx.strokeStyle = sunTwilightArcColor3;
        // ctx.beginPath();
        // ctx.arc(centerX, centerY, sunRadius, this.getRenderAngle(sunsetAngle + 4), this.getRenderAngle(sunsetAngle + 6)); // Pure 0.3.5 warns on this
        // ctx.stroke();

        // Draw the moon up arc
        ctx.lineWidth = 20;
        ctx.strokeStyle = moonArcColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, moonRadius, this.getRenderAngle(moonriseAngle), this.getRenderAngle(moonsetAngle)); // Pure 0.3.5 warns on this
        ctx.stroke();
        ctx.restore();

        // Draw the sun & moon
        ctx.translate(centerX, centerY);            // Set the origin to the center
        ctx.rotate(this.getRenderAngle(currentTimeAngle));               // Rotate our reference so the current time is on the X axis

        ctx.beginPath();
        ctx.fillStyle = backgroundColor;
        ctx.arc(sunRadius, 0, 35, 0, 2 * Math.PI);  // Draw a circle with the background color to clear the arc we drew above
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = (currentTimeAngle > sunriseAngle && currentTimeAngle < sunsetAngle) ? sunUpColor : sunDownColor;
        ctx.arc(sunRadius, 0, 30, 0, 2 * Math.PI);  // Now draw the sun itself
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = backgroundColor;
        ctx.arc(moonRadius, 0, 35, 0, 2 * Math.PI);  // Draw a circle with the background color to clear the arc we drew above
        ctx.fill();
        
        ctx.beginPath();
        ctx.fillStyle = moonArcColor;
        ctx.fillStyle = moonDownColor;
        ctx.arc(moonRadius, 0, 30, 0, 2 * Math.PI);  // Now draw the moon itself, this may just be an outline after the next draw
        ctx.fill();
        
        ctx.beginPath();
        ctx.fillStyle = moonArcColor;
        ctx.fillStyle = (currentTimeAngle > moonriseAngle && currentTimeAngle < moonsetAngle) ? moonUpColor : moonDownColor;
        ctx.arc(moonRadius, 0, 28, 0, 2 * Math.PI);  // Now draw the moon itself
        ctx.fill();
        
        ctx.rotate(-this.getRenderAngle(currentTimeAngle));
        ctx.translate(-centerX, -centerY);

        // Draw the labels
        ctx.font = smallFont;
        ctx.fillStyle = labelColor;

        ctx.fillText(`Sunrise:`,                                 quad1LabelX, (sunriseAngle <= 90) ? quad3LabelY      : quad1LabelY);
        ctx.fillText(`${this.convertDate(sunMoonJson.sunrise)}`, quad1LabelX, (sunriseAngle <= 90) ? quad3LabelY + 50 : quad1LabelY + 50);
        ctx.fillText(`Sunset: ` ,                                quad2LabelX, (sunsetAngle <= 270) ? quad2LabelY      : quad4LabelY);
        ctx.fillText(`${this.convertDate(sunMoonJson.sunset)}` , quad2LabelX, (sunsetAngle <= 270) ? quad2LabelY + 50 : quad4LabelY + 50);
        
        

        // if (stationData.winddir_avg10m !== -1) {
        // // Draw the wind direction arrow
        //     ctx.rotate((stationData.winddir_avg10m -90) * Math.PI/180);
        //     ctx.fillStyle = arrowColor;
        //     ctx.beginPath();
        //     ctx.moveTo(windRadius - 30, 0);
        //     ctx.lineTo(windRadius + 30, 20);
        //     ctx.lineTo(windRadius + 20, 0);
        //     ctx.lineTo(windRadius + 30, -20);
        //     ctx.lineTo(windRadius - 30, 0);
        //     ctx.fill();
        // }
        // ctx.restore();

        const jpegImg = jpeg.encode(img, 80);
        
        return {
            imageData: jpegImg,
            imageType: "jpg"
        };
    }

    // Input is the time in "hh:mm" format ("06:29"), "hh:mm:ss:nnn"
    // Step 1 - split the array into two elements
    // Step 2 - convert the hours and minutes into 0-360 degrees
    //          "00:00" = 0 degrees
    //          "06:29" = 6 * 15 + 29 / 4 = 97 degrees
    private getAngle(timeStr: string): number {
        const timeElements: Array<string> = timeStr.split(":");
        if (timeElements.length < 2 ||
            Number(timeElements[0]) === NaN ||
            Number(timeElements[0]) < 0 ||
            Number(timeElements[0]) > 23 ||
            Number(timeElements[1]) === NaN ||
            Number(timeElements[1]) < 0 ||
            Number(timeElements[1]) > 59) {
                this.logger.warn(`SunMoonImage: getAngle() failed on input "${timeStr}`);
                return -1;
            }
        let angle = +timeElements[0] * 15 + +timeElements[1] / 4;
        
        return angle;
    }

    // Input is the a number from 0-360. 
    // Output is with Midnight ("00:00") straight down, Noon is up
    // Step 1 - CTX reference is offset 90 degrees (along the x axis), do subtract 90
    // Step 2 - take the modulus 360 so the result is 0-359
    // Step 3 - Convert to radians
    private getRenderAngle(timeAngle: number): number {        
        let renderAngle = timeAngle + 180 - 90;
        renderAngle = renderAngle % 360
        renderAngle = renderAngle * Math.PI/180;
        return renderAngle;
    }

    // Input is the time in "hh:mm" format ("00:45"), "hh:mm:ss:nnn"
    // Output: 
    //  "00:45" ==> "12:45 AM"
    private convertDate(timeStr: string): string {
        const timeElements: Array<string> = timeStr.split(":");
        if (timeElements.length < 2 ||
            Number(timeElements[0]) === NaN ||
            Number(timeElements[0]) < 0 ||
            Number(timeElements[0]) > 23 ||
            Number(timeElements[1]) === NaN ||
            Number(timeElements[1]) < 0 ||
            Number(timeElements[1]) > 59) {
                this.logger.warn(`SunMoonImage: getAngle() failed on input "${timeStr}`);
                return "";
            }
        let hour = +timeElements[0] % 12;
        if (hour === 0)
            hour = 12;
        
        const min = +timeElements[1];

        const hourStr = (hour < 10) ? `0${hour}` : `${hour}`;
        const minStr  = (min < 10)  ? `0${min}`  : `${min}`;
        const amPmStr = (+timeElements[0] > 11) ? "PM" : "AM";
        return `${hourStr}:${minStr} ${amPmStr}`;
    }
}
