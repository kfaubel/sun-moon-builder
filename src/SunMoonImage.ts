/* eslint-disable @typescript-eslint/no-unused-vars */
import jpeg from "jpeg-js";
import path from "path";
import * as pure from "pureimage";

import { SunMoonData, SunMoonJson } from "./SunMoonData";
import { LoggerInterface } from "./Logger";
import { KacheInterface} from "./Kache";
import { relativeTimeThreshold } from "moment";

export interface ImageResult {
    imageType: string;
    imageData: jpeg.BufferRet | null;
}

export interface ImageBuffer {
    width: number;
    height: number;
    data: Uint8Array;
}

export class SunMoonImage {
    private cache: KacheInterface;
    private logger: LoggerInterface;

    /**
     * Constructor for SunMoonImage
     * @param logger Object that implements the LoggerInterface
     * @param cache Object that implements to KacheInterface
     */
    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    /**
     * This optimized fillRect was derived from the pureimage source code: https://github.com/joshmarinacci/node-pureimage/tree/master/src
     * To fill a 1920x1080 image on a core i5, this saves about 1.5 seconds
     * @param img Target image to draw on
     * @param x Position of the rect X
     * @param y Position of the rect Y
     * @param w Width of the rect
     * @param h Hieght of the rect
     * @param rgb Color in the form "#rrggbb"
     */
    // xeslint-disable-next-line @typescript-eslint/no-explicit-any
    private myFillRect(img: ImageBuffer, x: number, y: number, w: number, h: number, rgb: string) {
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

    /**
     * Gets data from SunMoonData and generates an HD image with the sun and moon rise and set 
     * @param location Location name for the title (e.g.: "Boston, MA")
     * @param lat Lattitude in decimal degrees north
     * @param lon Longitude in decimal degrees east (negative for west)
     * @param apiKey API key for https://api.ipgeolocation.io
     * @param timeZone Time zone (e.g.: "America/New_York")
     * @param dateStr Optional dataString in "YYYY-MM-DD" format
     * @returns ImageResult or null
     */
    public async getImage(location: string, lat: string, lon: string, apiKey: string, timeZone: string, dateStr = "") : Promise<ImageResult | null> {        
        const sunMoonData: SunMoonData = new SunMoonData(this.logger, this.cache);

        const sunMoonJson: SunMoonJson | null = await  sunMoonData.getSunMoonData(lat, lon, apiKey, timeZone, dateStr);

        if (sunMoonJson === null) {
            return null;
        }

        // Fix up the data
        sunMoonJson.firstLight = this.getTwilight(sunMoonJson?.sunrise, "am");
        sunMoonJson.lastLight  = this.getTwilight(sunMoonJson?.sunset,  "pm");

        if (sunMoonJson.moonrise === "-:-") // No moonrise this day.  Use AM midnight
            sunMoonJson.moonrise = "0:0";
        if (sunMoonJson.moonset === "-:-")  // No moonset this day. Use PM midnight
            sunMoonJson.moonset = "23:59";

        const twilightDegrees          = 24;     // 24 degrees before sunrise and 24 degrees after sunset
        const twilightMinutes          = 24 * 4; // 4 minutes per degree (96 minutes)

        const dataDate        = new Date(sunMoonJson.date + "T00:00:00"); // Without the explicit time, Date.Parse assume this is UTC and the day is off by 1.
        const title           = `Sun & Moon Times for ${location}`;
        const dateDisplayStr  = `${dataDate.toLocaleString()}`;

        // Define layout constants
        const imageHeight              = 1080; 
        const imageWidth               = 1920; 

        const centerX                  = imageWidth/2;
        const centerY                  = imageHeight/2 + 40;     // leave some extra room at the top for the title
        const sunCircleRadius          = 380; //imageHeight/3;          //360
        const moonCircleRadius         = 300; //imageHeight/4;          //270
        const sunArcWidth              = 35;
        const moonArcWidth             = 33;
        const sunRadius                = 35;                     // The actual sun drawn on the circle
        const moonRadius               = 35;

        const backgroundColor          = "#FFFFFA";              // format needed by myFillRect
        const circleColor              = "#B0B0B0";
        const timeLabelColor           = "#B0B0B0"; 
        const tickColor                = "#B0B0B0";
        const sunCircleColor           = "#504773"; //"#303050";
        const sunArcColor              = "#FCD303";
        const sunUpColor               = "#FDF000";
        const sunDownColor             = "#D1AF02";
        const sunTwilightArcColor1     = "#F0E000";
        const sunTwilightArcColor2     = "#B80010";
        const sunTwilightArcColor3     = "#7a2100"; //"#500028";
        const moonArcColor             = "#D0D0D0";
        const moonUpColor              = "#707070";
        const moonDownColor            = "#808080";
        const moonLabelColor           = "#707070";
        const titleColor               = "#2020F0"; 
        const labelColor               = "#2020F0";
        
        // Approximation of the height of a capital letter
        const largeFontCharHeight       = 54;
        const mediumFontCharHeight      = 40;
        const smallFontCharHeight       = 30;
        const xsmallFontCharHeight      = 22;

        const largeFont                 = "72px 'OpenSans-Bold'";     // Title
        const mediumFont                = "48px 'OpenSans-Regular";   // Other text
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

        const moonValuesSpacingY        = 60;
        
        const moonLabelX                = centerX - 180;
        const moonValueX                = centerX - 40;

        const moonHeaderY               = centerY - 140;
        const moonriseLabelY            = centerY - 60;
        const moonsetLabelY             = moonriseLabelY + moonValuesSpacingY;
        const moonAgeLabelY             = moonriseLabelY + moonValuesSpacingY * 2;
        const moonPhaseLabelY           = moonriseLabelY + moonValuesSpacingY * 3;

        const dateX                     = imageWidth * 3/4;
        const dateY                     = imageHeight - 20;

        const img = pure.make(imageWidth, imageHeight);
        const ctx = img.getContext("2d");

        // Extend ctx with function to dray centered text
        ctx.centerText = function(text: string, x: number, y: number): void {
            const width = this.measureText(text).width;
            this.fillText(text, x - width/2, y);
        };

        // Fill the background
        ctx.fillStyle = backgroundColor;
        //ctx.fillRect(0, 0, imageWidth, imageHeight);
        this.myFillRect(img, 0, 0, imageWidth, imageHeight, backgroundColor);

        // Draw the title
        ctx.fillStyle = titleColor;
        ctx.font = largeFont;
        const textWidth: number = ctx.measureText(title).width;
        ctx.fillText(title, (imageWidth - textWidth) / 2, titleY);

        // Change our reference to the center of the circle
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // Draw the minor tick marks on the hour
        ctx.lineCap = "round";
        ctx.strokeStyle = tickColor;
        ctx.lineWidth = 2;
        for (let i = 0; i < 360; i += 15) {
            ctx.rotate(15 * Math.PI/180);
            ctx.beginPath();
            ctx.moveTo(sunCircleRadius - 25, 0);
            ctx.lineTo(sunCircleRadius + 25, 0);
            ctx.stroke();
        }

        // Draw the major tick marks
        ctx.lineWidth = 8;
        for (let i = 0; i < 360; i += 90) {
            ctx.rotate(90 * Math.PI/180);
            ctx.beginPath();
            ctx.moveTo(sunCircleRadius - 30, 0);
            ctx.lineTo(sunCircleRadius + 30, 0);
            ctx.stroke();
        }

        ctx.restore();

        // Draw the path circle for the sun
        ctx.strokeStyle = sunCircleColor;
        ctx.lineWidth = sunArcWidth -4; // Slightly smaller.  We will draw over this and we don't want any edges showing
        ctx.beginPath();
        ctx.arc(centerX, centerY, sunCircleRadius, 0, 2 * Math.PI); // Pure 0.3.5 warns on this
        ctx.stroke();

        // Draw the path circle for the moon
        ctx.strokeStyle = moonArcColor;
        ctx.lineWidth = moonArcWidth/2; // Slightly smaller.  We will draw over this and we don't want any edges showing
        ctx.beginPath();
        ctx.arc(centerX, centerY, moonCircleRadius, 0, 2 * Math.PI); // Pure 0.3.5 warns on this
        ctx.stroke();

        // Draw the major time labels
        ctx.font = smallFont;
        ctx.fillStyle = timeLabelColor; //titleColor;
        ctx.fillText("12 PM", centerX - (ctx.measureText("12 PM").width/2),                  centerY - (sunCircleRadius                       + 50));
        ctx.fillText("12 AM", centerX - (ctx.measureText("12 AM").width/2),                  centerY + (sunCircleRadius + smallFontCharHeight + 50));
        ctx.fillText("6 AM",  centerX - (sunCircleRadius  + (ctx.measureText("6 AM").width) + 60), centerY + (smallFontCharHeight/2));
        ctx.fillText("6 PM",  centerX + (sunCircleRadius  +                                 + 60), centerY + (smallFontCharHeight/2));

        // SunMoonJson
        //     "sunrise": "06:20",
        //     "sunset": "19:04",
        //
        // There is always a sunrise and a sunset at the supported latitudes
        const sunriseAngle    = this.getAngle(sunMoonJson.sunrise);
        const sunsetAngle     = this.getAngle(sunMoonJson.sunset);
        const amTwilightAngle = sunriseAngle - twilightDegrees;
        const pmTwilightAngle = sunsetAngle + twilightDegrees;

        // If there were no moonrise or moonset this day, we already used 0 or 360 above
        const moonriseAngle = this.getAngle(sunMoonJson.moonrise);
        let moonsetAngle    = this.getAngle(sunMoonJson.moonset);

        if (moonsetAngle < moonriseAngle) {
            // actual moonset for today's moonrise is tomorrow. Add 360 to the moon angle
            moonsetAngle += 360;
        }

        // Current time format is "08:21:14.988" but getAngle only uses hh & mm so secs and msecs are ignored
        const currentTimeAngle = this.getAngle(sunMoonJson.current_time); 

        // Draw the sun up arc
        ctx.lineWidth = sunArcWidth;
        ctx.strokeStyle = sunArcColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, sunCircleRadius, this.getRenderAngle(sunriseAngle), this.getRenderAngle(sunsetAngle)); // Pure 0.3.5 warns on this
        ctx.stroke();
        
        // Draw the AM twilight range using a gradient
        const sunriseX    = sunCircleRadius * Math.sin(this.getRenderAngle(sunriseAngle + 90)); 
        const sunriseY    = sunCircleRadius * Math.cos(this.getRenderAngle(sunriseAngle + 90));
        const amTwilightX = sunCircleRadius * Math.sin(this.getRenderAngle(amTwilightAngle + 90));
        const amTwilightY = sunCircleRadius * Math.cos(this.getRenderAngle(amTwilightAngle + 90));

        // Setup the AM gradient
        const amGrad = ctx.createLinearGradient(centerX + sunriseX, centerY - sunriseY, centerX + amTwilightX, centerY - amTwilightY);
        amGrad.addColorStop(0.0, sunTwilightArcColor1);
        amGrad.addColorStop(1.0, sunTwilightArcColor3);
        ctx.strokeStyle = amGrad;
        ctx.lineWidth = sunArcWidth;
        // ctx.beginPath();
        // ctx.moveTo(centerX + sunriseX, centerY - sunriseY);
        // ctx.lineTo(centerX + amTwilightX, centerY - amTwilightY);
        // ctx.stroke();

        // Draw the AM twilight arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, sunCircleRadius, this.getRenderAngle(amTwilightAngle), this.getRenderAngle(sunriseAngle)); // Pure 0.3.5 warns on this
        ctx.stroke();

        // Draw a line at sunrise
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(sunriseAngle));
        ctx.beginPath();
        ctx.moveTo(sunCircleRadius - 50, 0);
        ctx.lineTo(sunCircleRadius + 50, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(sunriseAngle));
        ctx.restore();

        // Draw a line at AM twilight
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(amTwilightAngle));
        ctx.beginPath();
        ctx.moveTo(sunCircleRadius - 50, 0);
        ctx.lineTo(sunCircleRadius + 50, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(amTwilightAngle));
        ctx.restore();

        // Draw the evening twilight arc
        const sunsetX     = sunCircleRadius * Math.sin(this.getRenderAngle(sunsetAngle + 90)); 
        const sunsetY     = sunCircleRadius * Math.cos(this.getRenderAngle(sunsetAngle + 90));
        const pmTwilightX = sunCircleRadius * Math.sin(this.getRenderAngle(pmTwilightAngle + 90));
        const pmTwilightY = sunCircleRadius * Math.cos(this.getRenderAngle(pmTwilightAngle + 90));

        // Setup the pm gradient
        const pmGrad = ctx.createLinearGradient(centerX + sunsetX, centerY - sunsetY, centerX + pmTwilightX, centerY - pmTwilightY);
        pmGrad.addColorStop(0.0, sunTwilightArcColor1);
        pmGrad.addColorStop(1.0, sunTwilightArcColor3);
        ctx.strokeStyle = pmGrad;

        // Draw PM twilight arc
        ctx.beginPath();
        ctx.lineWidth = sunArcWidth;
        ctx.arc(centerX, centerY, sunCircleRadius, this.getRenderAngle(sunsetAngle), this.getRenderAngle(pmTwilightAngle)); // Pure 0.3.5 warns on this
        ctx.stroke();

        // Draw a long tick mark at sunset
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(sunsetAngle));
        ctx.beginPath();
        ctx.moveTo(sunCircleRadius - 50, 0);
        ctx.lineTo(sunCircleRadius + 50, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(sunsetAngle));
        ctx.translate(-centerX, -centerY);
        ctx.restore();

        // Draw a long tick mark at PM twilight
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(pmTwilightAngle));
        ctx.beginPath();
        ctx.moveTo(sunCircleRadius - 50, 0);
        ctx.lineTo(sunCircleRadius + 50, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(pmTwilightAngle));
        ctx.translate(-centerX, -centerY);
        ctx.restore();

        // Draw the moon up arc
        // ctx.lineCap = "round"; // line caps not support in pureImage
        ctx.lineWidth = moonArcWidth;
        ctx.strokeStyle = moonUpColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, moonCircleRadius, this.getRenderAngle(moonriseAngle), this.getRenderAngle(moonsetAngle)); // Pure 0.3.5 warns on this
        ctx.stroke();

        // Draw a little circle to simulate the "lineCap = 'round'" behavior

        // Draw rounded end of the moon arc at the rise point
        ctx.save();
        ctx.translate(centerX, centerY);                 // Set the origin to the center
        ctx.rotate(this.getRenderAngle(moonriseAngle));  // Rotate our reference so the current time is on the X axis

        ctx.beginPath();
        ctx.fillStyle = moonUpColor;
        ctx.arc(moonCircleRadius, 0, moonArcWidth/2, 0, 2 * Math.PI);  // Draw the cap
        ctx.fill();

        ctx.rotate(-this.getRenderAngle(moonriseAngle));
        ctx.restore();

        // Draw rounded end of the moon arc at the set point
        ctx.save();
        ctx.translate(centerX, centerY);                 // Set the origin to the center
        ctx.rotate(this.getRenderAngle(moonsetAngle));   // Rotate our reference so the current time is on the X axis

        ctx.beginPath();
        ctx.fillStyle = moonUpColor;
        ctx.arc(moonCircleRadius, 0, moonArcWidth/2, 0, 2 * Math.PI);  // Now draw the sun itself
        ctx.fill();

        ctx.rotate(-this.getRenderAngle(moonsetAngle));
        ctx.restore();

        // Draw the sun on the arc
        // Translate
        ctx.save();
        ctx.translate(centerX, centerY);            // Set the origin to the center
        ctx.rotate(this.getRenderAngle(currentTimeAngle));               // Rotate our reference so the current time is on the X axis

        // Clear a background circle 
        ctx.beginPath();
        ctx.fillStyle = backgroundColor;
        ctx.arc(sunCircleRadius, 0, sunRadius + 5, 0, 2 * Math.PI);  // Draw a circle with the background color to clear the arc we drew above
        ctx.fill();

        // Draw a circle in the arc color
        ctx.beginPath();
        ctx.fillStyle = sunArcColor;
        ctx.arc(sunCircleRadius, 0, sunRadius, 0, 2 * Math.PI);  // Now draw the sun itself
        ctx.fill();

        // Draw a circle inside in the brighter (daytime) color
        ctx.beginPath();
        ctx.fillStyle = (currentTimeAngle > sunriseAngle && currentTimeAngle < sunsetAngle) ? sunUpColor : sunDownColor;
        ctx.arc(sunCircleRadius, 0, sunRadius - 3, 0, 2 * Math.PI);  // Now draw the sun itself
        ctx.fill();

        ctx.rotate(-this.getRenderAngle(currentTimeAngle));
        ctx.restore();

        // // Draw the moon.  Draw a background cicle to clear the arc, draw an outline circle, draw the fill in a different color if visible
        // // Draw the sun on the arc
        // // Translate
        // ctx.save();
        // ctx.translate(centerX, centerY);            // Set the origin to the center
        // ctx.rotate(this.getRenderAngle(currentTimeAngle));               // Rotate our reference so the current time is on the X axis

        // ctx.beginPath();
        // ctx.fillStyle = backgroundColor;
        // ctx.arc(moonCircleRadius, 0, moonRadius + 5, 0, 2 * Math.PI);  // Draw a circle with the background color to clear the arc we drew above
        // ctx.fill();
        
        // ctx.beginPath();
        // ctx.fillStyle = moonDownColor;
        // ctx.arc(moonCircleRadius, 0, moonRadius, 0, 2 * Math.PI);  // Now draw the moon itself, this may just be an outline after the next draw
        // ctx.fill();
        
        // ctx.beginPath();
        // ctx.fillStyle = (currentTimeAngle > moonriseAngle && currentTimeAngle < moonsetAngle) ? moonUpColor : moonDownColor;
        // ctx.arc(moonCircleRadius, 0, moonRadius - 2, 0, 2 * Math.PI);  // Now draw the moon itself
        // ctx.fill();

        // ctx.rotate(-this.getRenderAngle(currentTimeAngle));
        // ctx.restore();
        
        

        // Draw the labels for sunrise, sunset, first light, last light
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
        
        type Point = {x: number, y: number};
        const labelSlotsOrig: Array<Point> = [ 
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

        const labelSlots: Array<Point> = [ 
            {x: 420, y: 350},
            {x: 370, y: 470},
            {x: 370, y: 680},
            {x: 420, y: 800},
            {x: 1470, y: 350},
            {x: 1520, y: 470},
            {x: 1520, y: 680},
            {x: 1470, y: 800},
            {x: 1420, y: 920}
        ];

        // sunriseAngle is 0-360.  0 is midnight, 180 is noon...
        let sunriseXY: Point;
        let amTwilightXY: Point;
        let sunsetXY: Point;
        let pmTwilightXY: Point;

        if (sunriseAngle <= 90) {
            // both sunrise and AM twilight are before 6:00AM
            sunriseXY    = labelSlots[2];
            amTwilightXY = labelSlots[3];
        } else if (sunriseAngle < 90 + twilightDegrees) {
            // sunrise is after 6:00 AM, but AM twilight is before 6:00 AM
            sunriseXY    = labelSlots[1];
            amTwilightXY = labelSlots[2];
        } else {
            // both sunrise and AM twilight are after 6:00 AM
            sunriseXY    = labelSlots[0];
            amTwilightXY = labelSlots[1];
        }

        if (sunsetAngle <= 270 - twilightDegrees) {
            // both sunset and PM twilight are before 6:00 PM
            sunsetXY     = labelSlots[4];
            pmTwilightXY = labelSlots[5];
        } else if (sunsetAngle < 270) {
            // sunset is before 6:00 PM but PM twilight is after 6:00 PM
            sunsetXY     = labelSlots[5];
            pmTwilightXY = labelSlots[6];
        } else if (sunsetAngle <= 270 + 20) {
            // both sunset and PM twilight are somewhat after 6:00 PM
            sunsetXY     = labelSlots[6];
            pmTwilightXY = labelSlots[7];
        } else {
            // both sunset and PM twilight are way past 6:00 PM
            sunsetXY     = labelSlots[7];
            pmTwilightXY = labelSlots[8];
        }

        ctx.centerText("Sunrise",                                    sunriseXY.x, sunriseXY.y); 
        ctx.centerText(`${this.formatTime(sunMoonJson.sunrise)}`,    sunriseXY.x, sunriseXY.y + 50);
        ctx.centerText("Sunset " ,                                   sunsetXY.x,  sunsetXY.y);
        ctx.centerText(`${this.formatTime(sunMoonJson.sunset)}` ,    sunsetXY.x,  sunsetXY.y + 50);

        ctx.centerText("First light",                                amTwilightXY.x, amTwilightXY.y);
        ctx.centerText(`${this.formatTime(sunMoonJson.firstLight)}`, amTwilightXY.x, amTwilightXY.y + 50);
        ctx.centerText("Last light" ,                                pmTwilightXY.x, pmTwilightXY.y);
        ctx.centerText(`${this.formatTime(sunMoonJson.lastLight)}` , pmTwilightXY.x, pmTwilightXY.y + 50);
        
        // Which quadrants are moonrise and moonset in?
        //    1  |  2
        //   ----+----
        //    0  |  3
        //
        type MoonPoint = {labelX: number, labelY: number, timeX: number, timeY: number};
        const moonSlots: Array<MoonPoint> = [ 
            {labelX: centerX - 120, labelY: centerY + 160, timeX: centerX - 120,  timeY: centerY + 200},
            {labelX: centerX - 120, labelY: centerY - 170, timeX: centerX - 120,  timeY: centerY - 130},
            {labelX: centerX + 120, labelY: centerY - 170, timeX: centerX + 120,  timeY: centerY - 130},
            {labelX: centerX + 120, labelY: centerY + 160, timeX: centerX + 120,  timeY: centerY + 200}
        ];

        // We calculated the angle (degrees) above as const moonriseAngle.  Angle is clockwise from striaght down
        let moonriseQuadrant: number;
        let moonsetQuadrant: number;

        if (moonriseAngle < 90) {
            moonriseQuadrant = 0;
            moonsetQuadrant = 2;
        } else if (moonriseAngle < 180) {            
            moonriseQuadrant = 1;
            moonsetQuadrant = 3;
        } else if (moonriseAngle < 270) {            
            moonriseQuadrant = 2;
            moonsetQuadrant = 0;
        } else {          
            moonriseQuadrant = 3;
            moonsetQuadrant = 1;
        }

        ctx.font = mediumFont;
        ctx.centerText("Moon",                                                                                centerX, centerY - 40);
        ctx.centerText(sunMoonJson.lunarPhase,                                                                centerX, centerY + 20);
        ctx.centerText(sunMoonJson.lunarIllumination + (sunMoonJson.lunarWaxWane === "waxing" ? " +" : " -"), centerX, centerY + 80);

        ctx.font = extraSmallFont;
        //ctx.fillStyle = moonLabelColor;
        ctx.centerText("Rise",                            moonSlots[moonriseQuadrant].labelX, moonSlots[moonriseQuadrant].labelY);
        ctx.centerText(this.formatTime(sunMoonJson.moonrise), moonSlots[moonriseQuadrant].timeX,  moonSlots[moonriseQuadrant].timeY);
        ctx.centerText("Set",                             moonSlots[moonsetQuadrant].labelX,  moonSlots[moonsetQuadrant].labelY);
        ctx.centerText(this.formatTime(sunMoonJson.moonset),  moonSlots[moonsetQuadrant].timeX,   moonSlots[moonsetQuadrant].timeY);
        
        // Draw a long tick mark at moonrise
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = moonLabelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(moonriseAngle));
        ctx.beginPath();
        ctx.moveTo(moonCircleRadius - 40, 0);
        ctx.lineTo(moonCircleRadius + 30, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(moonriseAngle));
        ctx.translate(-centerX, -centerY);
        ctx.restore();

        // Draw a long tick mark at moonset
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.strokeStyle = moonLabelColor;
        ctx.lineWidth = 3;
        ctx.rotate(this.getRenderAngle(moonsetAngle));
        ctx.beginPath();
        ctx.moveTo(moonCircleRadius - 40, 0);
        ctx.lineTo(moonCircleRadius + 30, 0);
        ctx.stroke();
        ctx.rotate(-this.getRenderAngle(moonsetAngle));
        ctx.translate(-centerX, -centerY);
        ctx.restore();

        // Draw the date in the lower right
        ctx.fillStyle = titleColor;
        ctx.fillText(dateDisplayStr, dateX, dateY);

        const jpegImg = jpeg.encode(img, 80);
        
        return {
            imageData: jpegImg,
            imageType: "jpg"
        };
    }

    /**
     * Takes the time ("hh:mm") and converts to degrees (0-359).  Every minute is 4 degrees
     * @param timeStr (hh:mm or hh:mm:ss)
     * @returns value in degrees 00:00 returns 0, 23:59 returns 359
     */
    private getAngle(timeStr: string): number {
        const timeElements: Array<string> = timeStr.split(":");
        if (timeElements.length < 2 ||
            isNaN(Number(timeElements[0])) ||
            isNaN(Number(timeElements[1])) ||
            Number(timeElements[0]) < 0 ||
            Number(timeElements[0]) > 23 ||
            Number(timeElements[1]) < 0 ||
            Number(timeElements[1]) > 59) {
            this.logger.warn(`SunMoonImage: getAngle() failed on input "${timeStr}"`);
            return 0;
        }
        const angle = +timeElements[0] * 15 + +timeElements[1] / 4;
        
        return angle;
    }
    
    /**
     * Coverts an angle where 0 is striaght up, 180 is straight down to a rotation (clockwise)
     * in radians from the X axis.  Used to calculate the angle needed in the arc().
     *   Step 1 - CTX reference is offset 90 degrees (along the x axis), so subtract 90
     *   Step 2 - take the modulus 360 so the result is 0-359
     *   Step 3 - Convert to radians
     * @param timeAngle angle in degrees 0-360
     * @returns rotation in radions from the X axis clockwise
     */
    private getRenderAngle(timeAngle: number): number {        
        let renderAngle = timeAngle + 180 - 90;
        renderAngle = renderAngle % 360;
        renderAngle = renderAngle * Math.PI/180;
        return renderAngle;
    }

    /**
     * Formats the time for display.  For "22:45" returns "10:45 PM"
     * @param timeStr time in 24 hour format (hh:mm or hh:mm:ss, hh:mm:ss:nnn)
     * @returns Formatted string in 12 hour time with AM/PM 
     */
    private formatTime(timeStr: string): string {
        const timeElements: Array<string> = timeStr.split(":");
        if (timeElements.length < 2 ||
            isNaN(Number(timeElements[0])) ||
            isNaN(Number(timeElements[1])) ||
            Number(timeElements[0]) < 0 ||
            Number(timeElements[0]) > 23 ||
            Number(timeElements[1]) < 0 ||
            Number(timeElements[1]) > 59) {
            this.logger.warn(`SunMoonImage: formatTime() failed on input "${timeStr}`);
            return "";
        }
        let hour = +timeElements[0] % 12;
        if (hour === 0)
            hour = 12;
        
        const min = +timeElements[1];

        //const hourStr = (hour < 10) ? `0${hour}` : `${hour}`;
        const minStr  = (min < 10)  ? `0${min}`  : `${min}`;
        const amPmStr = (+timeElements[0] > 11) ? "PM" : "AM";
        return `${hour}:${minStr} ${amPmStr}`;
    }

    /**
     * Calculates a time 90 minutes earlier/later than the time given.
     * @param timeStr Time in "hh:mm" (24 hour) format
     * @param amPm If "am", subtrack 90 minutes.  If "pm", add 90 minutes
     * @returns Time in "hh:mm" format
     */
    private getTwilight(timeStr: string, amPm: string): string {
        const timeElements: Array<string> = timeStr.split(":");
        if (timeElements.length < 2 ||
            isNaN(Number(timeElements[0])) ||
            isNaN(Number(timeElements[1])) ||
            Number(timeElements[0]) < 0 ||
            Number(timeElements[0]) > 23 ||
            Number(timeElements[1]) < 0 ||
            Number(timeElements[1]) > 59) {
            this.logger.warn(`SunMoonImage: getTwilight() failed on input "${timeStr}`);
            return "";
        }
        let hour = +timeElements[0] % 12;
        if (hour === 0)
            hour = 12;
        
        let min = +timeElements[1];

        
        if (amPm === "am") {
            // subtract 96 minutes (24 degrees)
            if (min >= 36) {
                min -= 36;
                hour -= 1;
            } else {
                min += 24;
                hour -= 2;
            }
        } else {
            // add 90 minutes (24 degrees)
            if (min < 36) {
                min += 24;
                hour += 1;
            } else {
                min -= 36;
                hour += 2;
            }
        }

        const hourStr = (hour < 10) ? `0${hour}` : `${hour}`;
        const minStr  = (min < 10)  ? `0${min}`  : `${min}`;
        return `${hourStr}:${minStr}`;
    }
}
