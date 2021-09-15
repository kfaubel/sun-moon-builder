/* eslint-disable @typescript-eslint/no-unused-vars */
import jpeg from "jpeg-js";
import fs, { stat } from "fs";
import path from "path";
import dateFormat from "dateformat";
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

    public async getImage(location: string, lat: string, lon: string, apiKey: string, dateStr = "") : Promise<ImageResult | null> {
        const title = `Sun & Moon Times for ${location}`;
        
        const sunMoonData: SunMoonData = new SunMoonData(this.logger);

        const sunMoonJson: SunMoonJson | null = await  sunMoonData.getSunMoonData(lat, lon, apiKey, dateStr);

        if (sunMoonJson === null) {
            this.logger.warn("SunMoonImage: Failed to get data, no image available.\n");
            return null;
        }

        sunMoonJson.firstLight = this.getTwilight(sunMoonJson?.sunrise, "am");
        sunMoonJson.lastLight  = this.getTwilight(sunMoonJson?.sunset,  "pm");

        const imageHeight              = 1080; 
        const imageWidth               = 1920; 

        const centerX                  = imageWidth/2;
        const centerY                  = imageHeight/2 + 40;
        const sunRadius                = imageHeight/3; //360
        const moonRadius               = imageHeight/4; //270

        const backgroundColor          = "#E0E0F0";              // format needed by myFillRect
        const circleColor              = "#B0B0B0";
        const sunCircleColor           = "#303050";
        const sunArcColor              = "#FCD303";
        const sunUpColor               = "#FDF000";
        const sunDownColor             = "#D1AF02";
        const sunTwilightArcColor1     = "#F0E000";
        const sunTwilightArcColor2     = "#B80010";
        const sunTwilightArcColor3     = "#500028";
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

        
            
        
        const toplleft1LabelX               = 380;
        const toplleft1LabelY               = 350;
        const toplleft2LabelX               = toplleft1LabelX;
        const toplleft2LabelY               = toplleft1LabelY + 120;
        const toplright1LabelX              = 1400;
        const toplright1LabelY              = 350;
        const toplright2LabelX              = toplright1LabelX;
        const toplright2LabelY              = toplright1LabelY + 120;
        const botleft1LabelX                = 380;
        const botleft1LabelY                = 680;
        const botleft2LabelX                = botleft1LabelX;
        const botleft2LabelY                = botleft1LabelY + 120;
        const botright1LabelX               = 1400;
        const botright1LabelY               = 680;
        const botright2LabelX               = botright1LabelX;
        const botright2LabelY               = botright1LabelY + 120;

        const moonriseLabelX = centerX - 110;
        const moonriseLabelY = centerY - 80;
        const moonriseValueX = centerX - 110;
        const moonriseValueY = centerY - 30;
        const moonsetLabelX  = centerX - 110;
        const moonsetLabelY  = centerY + 50;
        const moonsetValueX  = centerX - 110;
        const moonsetValueY  = centerY + 110;
        const dateX          = imageWidth * 3/4;
        const dateY          = imageHeight - 30;

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
        

        
        ctx.save();

        // Change our reference to the center of the wind circle
        ctx.translate(centerX, centerY);
        
        // Draw the minor tick marks
        ctx.lineCap = "round";
        ctx.strokeStyle = circleColor;
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

        // Draw the circle for the sun
        ctx.strokeStyle = sunCircleColor;
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.arc(centerX, centerY, sunRadius, 0, 2 * Math.PI); // Pure 0.3.5 warns on this
        ctx.stroke();

        // Draw the circle for the moon

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

        // SunMoonJson
        //     "sunrise": "06:20",
        //     "sunset": "19:04",
        //
        // There is always a sunrise and a sunset at supported latitudes
        const sunriseAngle     = this.getAngle(sunMoonJson.sunrise);
        const sunsetAngle      = this.getAngle(sunMoonJson.sunset);

        // There is either no moonrise or no moonset that day.  Use midnight instead (0 for moonrise, 360 for moonset)
        const moonriseAngle    = (sunMoonJson.moonrise === "-:-") ? 0   : this.getAngle(sunMoonJson.moonrise);
        let moonsetAngle     = (sunMoonJson.moonset === "-:-")  ? 360 : this.getAngle(sunMoonJson.moonset);

        if (moonsetAngle < moonriseAngle) {
            // actual moonset for today's moonrise is tomorrow. Add 360 to the angle
            moonsetAngle += 360;
        }

        // Current time is "08:21:14.988" but getAngle only uses hh & mm
        const currentTimeAngle = this.getAngle(sunMoonJson.current_time); 

        // Draw the sun up arc
        ctx.lineWidth = 20;
        ctx.strokeStyle = sunArcColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, sunRadius, this.getRenderAngle(sunriseAngle), this.getRenderAngle(sunsetAngle)); // Pure 0.3.5 warns on this
        ctx.stroke();

        
        
        // Draw the AM twilight range using a gradient
        const sunriseX    = sunRadius * Math.sin(this.getRenderAngle(sunriseAngle + 90)); 
        const sunriseY    = sunRadius * Math.cos(this.getRenderAngle(sunriseAngle + 90));
        const amTwilightX = sunRadius * Math.sin(this.getRenderAngle(sunriseAngle + 90 - 22));
        const amTwilightY = sunRadius * Math.cos(this.getRenderAngle(sunriseAngle + 90 - 22));

        // Set up the gradient
        const amGrad = ctx.createLinearGradient(centerX + sunriseX, centerY - sunriseY, centerX + amTwilightX, centerY - amTwilightY);
        amGrad.addColorStop(0.0, sunTwilightArcColor1);
        amGrad.addColorStop(1.0, sunTwilightArcColor3);
        ctx.strokeStyle = amGrad;
        ctx.lineWidth = 20;

        // Draw the short arc
        ctx.beginPath();
        ctx.lineWidth = 20;
        ctx.arc(centerX, centerY, sunRadius, this.getRenderAngle(sunriseAngle - 22), this.getRenderAngle(sunriseAngle)); // Pure 0.3.5 warns on this
        ctx.stroke();

        // Draw a longer tick mark at sunrise
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(sunriseAngle));
        ctx.beginPath();
        ctx.moveTo(sunRadius - 50, 0);
        ctx.lineTo(sunRadius + 50, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(sunriseAngle));
        ctx.restore();

        // Draw a longer tick mark at AM twilight
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(sunriseAngle - 22));
        ctx.beginPath();
        ctx.moveTo(sunRadius - 50, 0);
        ctx.lineTo(sunRadius + 50, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(sunriseAngle + 22));
        ctx.restore();


        // Draw the evening twilight arc
        // Setup the pm gradient
        const sunsetX     = sunRadius * Math.sin(this.getRenderAngle(sunsetAngle + 90)); 
        const sunsetY     = sunRadius * Math.cos(this.getRenderAngle(sunsetAngle + 90));
        const pmTwilightX = sunRadius * Math.sin(this.getRenderAngle(sunsetAngle + 90 + 22));
        const pmTwilightY = sunRadius * Math.cos(this.getRenderAngle(sunsetAngle + 90 + 22));

        const pmGrad = ctx.createLinearGradient(centerX + sunsetX, centerY - sunsetY, centerX + pmTwilightX, centerY - pmTwilightY);
        pmGrad.addColorStop(0.0, sunTwilightArcColor1);
        pmGrad.addColorStop(1.0, sunTwilightArcColor3);
        ctx.strokeStyle = pmGrad;

        // Draw PM twilight
        ctx.beginPath();
        ctx.lineWidth = 20;
        ctx.arc(centerX, centerY, sunRadius, this.getRenderAngle(sunsetAngle), this.getRenderAngle(sunsetAngle + 22)); // Pure 0.3.5 warns on this
        ctx.stroke();

        // Draw a longer tick mark at sunset
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(sunsetAngle));
        ctx.beginPath();
        ctx.moveTo(sunRadius - 50, 0);
        ctx.lineTo(sunRadius + 50, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(sunsetAngle));
        ctx.translate(-centerX, -centerY);
        ctx.restore();

        // Draw a longer tick mark at PM twilight
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(sunsetAngle + 22));
        ctx.beginPath();
        ctx.moveTo(sunRadius - 50, 0);
        ctx.lineTo(sunRadius + 50, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(sunsetAngle + 22));
        ctx.translate(-centerX, -centerY);
        ctx.restore();
        

        // Draw the moon up arc
        ctx.lineWidth = 20;
        ctx.strokeStyle = moonArcColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, moonRadius, this.getRenderAngle(moonriseAngle), this.getRenderAngle(moonsetAngle)); // Pure 0.3.5 warns on this
        ctx.stroke();
        

        // Draw the sun
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

        // Draw the moon.  Draw a background cicle to clear the arc, draw an outline circle, draw the fill in a different color if visible
        ctx.beginPath();
        ctx.fillStyle = backgroundColor;
        ctx.arc(moonRadius, 0, 35, 0, 2 * Math.PI);  // Draw a circle with the background color to clear the arc we drew above
        ctx.fill();
        
        ctx.beginPath();
        ctx.fillStyle = moonDownColor;
        ctx.arc(moonRadius, 0, 30, 0, 2 * Math.PI);  // Now draw the moon itself, this may just be an outline after the next draw
        ctx.fill();
        
        ctx.beginPath();
        ctx.fillStyle = (currentTimeAngle > moonriseAngle && currentTimeAngle < moonsetAngle) ? moonUpColor : moonDownColor;
        ctx.arc(moonRadius, 0, 28, 0, 2 * Math.PI);  // Now draw the moon itself
        ctx.fill();
        
        ctx.rotate(-this.getRenderAngle(currentTimeAngle));
        ctx.translate(-centerX, -centerY);

        // Draw the labels
        ctx.font = smallFont;
        ctx.fillStyle = labelColor;

        // +---------+--------+
        // | slot 0  | slot 4 |
        // | slot 1  | slot 5 |
        // +---------+--------+
        // | slot 2  | slot 6 |
        // | slot 3  | slot 7 |
        // |         | slot 8 | - We need this for mid summer when the sun does not set until 8:30
        // +---------+--------+
        
        const labelSlots = [ 
            {x: 350, y: 350},
            {x: 300, y: 470},
            {x: 300, y: 680},
            {x: 350, y: 800},
            {x: 1400, y: 350},
            {x: 1450, y: 470},
            {x: 1450, y: 680},
            {x: 1400, y: 800},
            {x: 1350, y: 920}
        ];

        // sunriseAngle is 0-360.  0 is midnight, 180 is noon...
        let sunriseXY;
        let amTwilightXY;
        let sunsetXY;
        let pmTwilightXY;

        if (sunriseAngle <= 90) {
            // both sunrise and AM twilight are before 6:00AM
            sunriseXY = labelSlots[2];
            amTwilightXY = labelSlots[3];
        } else if (sunriseAngle < 112) {
            // sunrise is after 6:00 AM, but AM twilight is before 6:00 AM
            sunriseXY = labelSlots[1];
            amTwilightXY = labelSlots[2];
        } else {
            // both sunrise and AM twilight are after 6:00 AM
            sunriseXY = labelSlots[0];
            amTwilightXY = labelSlots[1];
        }

        if (sunsetAngle <= 248) {
            // both sunset and PM twilight are before 6:00 PM
            sunsetXY = labelSlots[4];
            pmTwilightXY = labelSlots[5];
        } else if (sunsetAngle < 270) {
            // sunset is before 6:00 PM but PM twilight is after 6:00 PM
            sunsetXY = labelSlots[5];
            pmTwilightXY = labelSlots[6];
        } else if (sunsetAngle <= 290) {
            // both sunset and PM twilight are somewhat after 6:00 PM
            sunsetXY = labelSlots[6];
            pmTwilightXY = labelSlots[7];
        } else {
            // both sunset and PM twilight are way past 6:00 PM
            sunsetXY = labelSlots[7];
            pmTwilightXY = labelSlots[8];
        }

        ctx.fillText("Sunrise",                                     sunriseXY.x, sunriseXY.y); 
        ctx.fillText(`${this.convertTime(sunMoonJson.sunrise)}`,    sunriseXY.x, sunriseXY.y + 50);
        ctx.fillText("Sunset " ,                                    sunsetXY.x,  sunsetXY.y);
        ctx.fillText(`${this.convertTime(sunMoonJson.sunset)}` ,    sunsetXY.x,  sunsetXY.y + 50);

        ctx.fillText("First light",                                 amTwilightXY.x, amTwilightXY.y);
        ctx.fillText(`${this.convertTime(sunMoonJson.firstLight)}`, amTwilightXY.x, amTwilightXY.y + 50);
        ctx.fillText("Last light" ,                                 pmTwilightXY.x, pmTwilightXY.y);
        ctx.fillText(`${this.convertTime(sunMoonJson.lastLight)}` , pmTwilightXY.x, pmTwilightXY.y + 50);
        
        

        ctx.fillStyle = moonArcColor;
        ctx.fillText("Moonrise",                                  moonriseLabelX, moonriseLabelY); 
        ctx.fillText(`${(sunMoonJson.moonrise === "-:-") ? "Yesterday" : this.convertTime(sunMoonJson.moonrise)}`, moonriseValueX, moonriseValueY); 
        ctx.fillText("Moonset",                                   moonsetLabelX,  moonsetLabelY); 
        ctx.fillText(`${(sunMoonJson.moonset === "-:-") ? "tomorrow" : this.convertTime(sunMoonJson.moonset)}` , moonsetValueX,  moonsetValueY); 

        const dataDate = new Date(sunMoonJson.date);
        ctx.fillStyle = labelColor;
        ctx.fillText(dateFormat(dataDate, "mmmm dS, yyyy"), dateX, dateY);        
        
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
            isNaN(Number(timeElements[0])) ||
            isNaN(Number(timeElements[1])) ||
            Number(timeElements[0]) < 0 ||
            Number(timeElements[0]) > 23 ||
            Number(timeElements[1]) < 0 ||
            Number(timeElements[1]) > 59) {
            this.logger.warn(`SunMoonImage: getAngle() failed on input "${timeStr}`);
            return -1;
        }
        const angle = +timeElements[0] * 15 + +timeElements[1] / 4;
        
        return angle;
    }

    // Input is the a number from 0-360. 
    // Output is with Midnight ("00:00") straight down, Noon is up
    // Step 1 - CTX reference is offset 90 degrees (along the x axis), do subtract 90
    // Step 2 - take the modulus 360 so the result is 0-359
    // Step 3 - Convert to radians
    private getRenderAngle(timeAngle: number): number {        
        let renderAngle = timeAngle + 180 - 90;
        renderAngle = renderAngle % 360;
        renderAngle = renderAngle * Math.PI/180;
        return renderAngle;
    }

    // Input is the time in "hh:mm" format ("00:45"), "hh:mm:ss:nnn"
    // Output: 
    //  "00:45" ==> "12:45 AM"
    private convertTime(timeStr: string): string {
        const timeElements: Array<string> = timeStr.split(":");
        if (timeElements.length < 2 ||
            isNaN(Number(timeElements[0])) ||
            isNaN(Number(timeElements[1])) ||
            Number(timeElements[0]) < 0 ||
            Number(timeElements[0]) > 23 ||
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

    // Take the input (hh:mm) and subtract 90 min in the am and add 90 min in the pm.  Return (hh:mm)
    private getTwilight(timeStr: string, amPm: string): string {
        const timeElements: Array<string> = timeStr.split(":");
        if (timeElements.length < 2 ||
            isNaN(Number(timeElements[0])) ||
            isNaN(Number(timeElements[1])) ||
            Number(timeElements[0]) < 0 ||
            Number(timeElements[0]) > 23 ||
            Number(timeElements[1]) < 0 ||
            Number(timeElements[1]) > 59) {
            this.logger.warn(`SunMoonImage: getAngle() failed on input "${timeStr}`);
            return "";
        }
        let hour = +timeElements[0] % 12;
        if (hour === 0)
            hour = 12;
        
        let min = +timeElements[1];

        if (amPm === "am") {
            // subtract 48 minutes (12 degrees)
            if (min >= 30) {
                min -= 30;
                hour -= 1;
            } else {
                min += 30;
                hour -= 2;
            }
        } else {
            // add 48 minutes (12 degrees)
            if (min < 30) {
                min += 30;
                hour += 1;
            } else {
                min -= 30;
                hour += 2;
            }
        }

        const hourStr = (hour < 10) ? `0${hour}` : `${hour}`;
        const minStr  = (min < 10)  ? `0${min}`  : `${min}`;
        return `${hourStr}:${minStr}`;
    }
}
