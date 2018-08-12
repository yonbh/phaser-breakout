/*
* @author   Yon Chau Beh
*
* Scripts to run the BreakOut-like game.
* Dependant on Phaser CE 2.11.0.
*
*/

// generating the canvas; AUTO, WEBGL, CANVAS
var game = new Phaser.Game(600, 800, Phaser.CANVAS, "breakout-yon", {
    preload: preload, create: create, update: update});

var ball;
var ballTrail;
var balls = ["images/ball-grey.png", "images/ball-blue.png", "images/ball-orange.png"];
var paddle;
var background;

var bricks;
var newBrick;
var brickStatus;
var brickCounter;

var brickShadows;
var brickShadow;
var paddleShadow;
var shadowOffset = 6;

var scoreInfo;
var score = 0;

var hp = 3;
var hpInfo;
var hpLostInfo;

var start = false;
var mouseButton;
var keyboardButton;
var mouseMode = false;
var keyboardMode = false;

var startText;
var gameOverText;
var victoryText;


// preload assets
function preload() {
    // scale mode to use so that the game scales on varying devices and screen sizes
    // NO_SCALE, EXACT_FIT, SHOW_ALL......
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    // align horizontally to center canvas
    game.scale.pageAlignHorizontally = true;
    // align vertically to center canvas
    game.scale.pageAlignVertically = true;
    game.load.image("ball", balls[randomNumber(0, 2)]);
    game.load.image("paddle", "images/paddle.png");
    game.load.image("brick", "images/brick.png");
    game.load.image("background", "images/background.png");
    // slice into 120x40px sections for buttons
    game.load.spritesheet("mouseButton", "images/mouseButton.png", 120, 40);
    game.load.spritesheet("keyboardButton", "images/keyboardButton.png", 120, 40);
}


// create things that are loaded and ready
function create() {
    // select physics engine
    game.physics.startSystem(Phaser.Physics.ARCADE);
    background = game.add.tileSprite(0, 0, 600, 800, "background");

    // add ball sprite
    ball = game.add.sprite(game.world.width / 2, game.world.height - 45,  "ball");
    ball.scale.setTo(0.8, 0.8);
    // reset its anchor to the middle of the image/object
    ball.anchor.set(0.5);
    // apply physics on ball
    game.physics.enable(ball, Phaser.Physics.ARCADE);
    // apply boundaries i.e., simulating borders as walls for the ball's movements
    ball.body.collideWorldBounds = true;
    // enable the ball to bounce after collision with wall
    ball.body.bounce.set(1);
    // make the ball check if it has gone out of set bounds e.g., walls
    ball.checkWorldBounds = true;
    // if out of bounds, simulate game over event and message
    ball.events.onOutOfBounds.add(ballOutEffect, this);

    // adding trail to ball
    ballTrail = game.add.emitter(ball.x, ball.y + 10, 400);
    ballTrail.width = 10;
    ballTrail.makeParticles("ball");
    ballTrail.setXSpeed(30, -30);
    ballTrail.setYSpeed(160, 140);
    ballTrail.setAlpha(0.6, 0, 600);
    ballTrail.setScale(0.04, 0.4, 0.04, 0.4, 2000, Phaser.Easing.Quintic.Out);
    // lifespan and frequency
    ballTrail.start(false, 5000, 6);

    // add paddle sprite and its shadows
    paddle = game.add.sprite(game.world.centerX, game.world.height - 20, "paddle");
    paddle.scale.setTo(1, 1.5);
    paddleShadow = game.add.sprite(game.world.centerX + shadowOffset, game.world.height - 20 + shadowOffset, "paddle");
    paddleShadow.scale.setTo(1, 1.5);
    paddleShadow.tint = 0x000000;
    paddleShadow.alpha = 0.1;
    // bring to top of render list so shadows will be below paddle
    game.world.bringToTop(paddle);
    // change its anchor from default top left to the middle of object
    // anchor value between 0 to 1 for its x and y anchors
    paddle.anchor.set(0.5, 1);
    paddleShadow.anchor.set(0.5, 1);
    // enable physics for the paddle
    game.physics.enable(paddle, Phaser.Physics.ARCADE);
    // make the paddle immovable e.g., so it does not move away from its axis when collided with the ball
    paddle.body.immovable = true;

    // disable collision for bottom wall hence allowing ball to fall off screen
    game.physics.arcade.checkCollision.down = false;

    initialiseBricks();
    brickCounter = brickStatus.count.columns * brickStatus.count.rows;
    generateShadow();
    game.world.bringToTop(bricks);

    // x, y positions of the score counter and its style
    scoreInfo = game.add.text(55, 20, "SCORE: 0", {font: "14px Serif", fill: "#4d453b"});

    // generating health counters and health lost messages
    hpInfo = game.add.text(game.world.width - 55, 20, "HEALTH: " + hp, {font: "14px Serif", fill: "#993191"});
    // anchor on top right
    hpInfo.anchor.set(1,0);
    hpLostInfo = game.add.text(game.world.centerX, game.world.centerY + 50, "HEALTH LOST!\nONE STEP CLOSER TO THE INEVITABLE!", {font: "26px Serif", fill: "#af3524", align: "center"});
    // anchor on middle
    hpLostInfo.anchor.set(0.5);
    hpLostInfo.visible = false;

    // generate a button (xPos, yPos, name, function, context, frames for hover, out and down state) (commented out)
    mouseButton = game.add.button(game.world.centerX - 140, game.world.centerY + 160, "mouseButton", startGameMouse, this, 1, 0, 2);
    keyboardButton = game.add.button(game.world.centerX + 140, game.world.centerY + 160, "keyboardButton", startGameKeyboard, this, 1, 0, 2);
    mouseButton.anchor.set(0.5, 0.5);
    keyboardButton.anchor.set(0.5, 0.5);
    startText = game.add.text(game.world.centerX, game.world.centerY + 80, "BREAKOUT REPLICA BY YON\nPhaser CE 2.11.0\n\n--CHOOSE MODE--", {font: "26px Serif", fill: "#603926", align: "center"} );
    startText.anchor.set(0.5,0.5);
}


// updates every frame
function update() {
    // let phaser handle the collision detection between the ball and paddle and its effects
    game.physics.arcade.collide(ball, paddle, ballPaddleCollide);
    // enable collision between ball and bricks and also what its consequences are (third param)
    game.physics.arcade.collide(ball, bricks, brickCollideEffect);

    // let user input affect paddle's position hence controlling the paddle; also centers the paddle at start
    if(start) {
        // if ball is moving, simulate rotating animation of ball
        if(ball.body.velocity.x !== 0) {
            ball.angle += 20;
        }

        // keyboard mode controls and speed of paddle using keyboard input
        if (keyboardMode) {
            if (game.input.keyboard.isDown(Phaser.Keyboard.LEFT) || game.input.keyboard.isDown(Phaser.Keyboard.A)) {
                paddle.x -= 15;
                paddleShadow.x = paddle.x + shadowOffset;
            }
            else if (game.input.keyboard.isDown(Phaser.Keyboard.RIGHT) || game.input.keyboard.isDown(Phaser.Keyboard.D)) {
                paddle.x += 15;
                paddleShadow.x = paddle.x + shadowOffset;
            }
        }

        // mouse controls
        else if(mouseMode) {
            paddle.x = game.input.x;
            paddleShadow.x = paddle.x + shadowOffset;
        }

        // make sure paddle does not go off screen
        if(paddle.x < 40) {
            paddle.x = 40;
            paddleShadow.x = paddle.x + shadowOffset;
        }
        else if(paddle.x > game.width - 40) {
            paddle.x = game.width - 40;
            paddleShadow.x = paddle.x + shadowOffset;
        }

        // make sure trail is on ball
        ballTrail.x = ball.x;
        ballTrail.y = ball.y;
    }
}


// initialise the bricks with its states and characteristics
// offset used to determine where to start drawing the bricks
function initialiseBricks() {
    brickStatus = {
        width: 50,
        height: 20,
        // generate random number of row each run
        count: {
            rows: randomNumber(4, 6),
            columns: 8
        },
        offset: {
            top: 160,
            left: 60
        },
        padding: {
            y: 19,
            x: 18,
        }
    };

    // initialise an empty group to bricks to store each brick to be in the game
    bricks = game.add.group();
    // loop to generate each brick and its properties
    for(var col = 0; col < brickStatus.count.columns; col++) {
        for(var row = 0; row < brickStatus.count.rows; row++) {
            // update positions on each iteration so its not all rendered in the same exact spot
            var posX = (col * (brickStatus.width + brickStatus.padding.x)) + brickStatus.offset.left;
            var posY = (row * (brickStatus.height + brickStatus.padding.y)) + brickStatus.offset.top;
            newBrick = game.add.sprite(posX, posY, "brick");
            game.physics.enable(newBrick, Phaser.Physics.ARCADE);
            newBrick.body.immovable = true;
            newBrick.anchor.set(0.5, 0.5);
            bricks.add(newBrick);
        }
    }
}


// initialise and create a set of shadows for the generated bricks in the game
function generateShadow() {
    brickShadows = game.add.group();
    for(var col = 0; col < brickStatus.count.columns; col++) {
        for(var row = 0; row < brickStatus.count.rows; row++) {
            // update positions on each iteration so its not all rendered in the same exact spot
            var posShadowX = (col * (brickStatus.width + brickStatus.padding.x)) + brickStatus.offset.left + shadowOffset;
            var posShadowY = (row * (brickStatus.height + brickStatus.padding.y)) + brickStatus.offset.top + shadowOffset;
            brickShadow = game.add.sprite(posShadowX, posShadowY, "brick");
            game.physics.enable(brickShadow, Phaser.Physics.ARCADE);
            brickShadow.anchor.set(0.5, 0.5);
            brickShadow.tint = 0x000000;
            brickShadow.alpha = 0.15;
            brickShadows.add(brickShadow);
        }
    }
}


// destroy the shadow of the brick that was destroyed by the ball through overlapping sprite detection
function destroyShadow(brick) {
    for(var n = 0; n < brickShadows.children.length; n++) {
        if(game.physics.arcade.overlap(brick, brickShadows.children[n], null, null, this)) {
            brickShadows.children[n].destroy();
        }
    }
}


// what happens when ball collides with bricks; goes through an animation before it disappears from the game
function brickCollideEffect(ball, brick) {
    // remove the shadow of this block
    destroyShadow(brick);
    // delete that collided brick together with a tween effect
    var killBrickEffect = game.add.tween(brick.scale);
    // makes sprite body to null so ball can pass through it despite animation still going on
    brick.body = null;
    // change the opacity for visibility purposes for the player
    brick.alpha = 0.4;
    // its end effect (state, time in ms taken, easing method to use)
    // float towards screen
    killBrickEffect.to({x: 1.2, y: 1.2}, 600, Phaser.Easing.Elastic.Out);
    // disappear
    killBrickEffect.to({x: 0, y: 0}, 100, Phaser.Easing.Linear.None);
    // kill object when tweens are done
    killBrickEffect.onChildComplete.addOnce(function(){
        brick.kill();
    }, this);
    // start the tween
    killBrickEffect.start();

    // update score
    score += 100;
    // update score counter printed on screen
    scoreInfo.setText("SCORE: " + score);

    // reduce brick count
    brickCounter--;

    // win condition check
    if(brickCounter === 0) {
        ball.body.velocity.setTo(0, 0);
        victoryText = game.add.text(game.world.centerX, game.world.centerY, "GG EZ WIN!!!\n\n" + "SCORE: " + score + "\n\n-CLICK TO RESTART-", {font: "28px Serif", fill: "#246d0e", align: "center"});
        victoryText.anchor.set(0.5, 0.5);
        game.input.onDown.add(function() {
            location.reload();
        }, this);
    }
}


// define what happens when ball collides with paddle
function ballPaddleCollide() {
    // changes angle/velocity depending on where the ball collides with the paddle
    var angleOffset = 0;
    // if ball hits left part of paddle
    if(ball.x < paddle.x) {
        angleOffset = paddle.x - ball.x;
        ball.body.velocity.x = (-10 * angleOffset);
    }
    // if ball hits right parts of paddle
    else if(ball.x > paddle.x) {
        angleOffset = ball.x - paddle.x;
        ball.body.velocity.x = (10 * angleOffset);
    }
    // if ball hits middle of paddle
    else {
        ball.body.velocity.x = 2 + Math.random() * 6;
    }
}


// ball out of bounds effects
function ballOutEffect() {
    // reduce health count
    hp--;
    if(hp) {
        // update hp counter
        hpInfo.setText("HEALTH: " + hp);
        // show health lost message on screen
        hpLostInfo.visible = true;
        // reset ball and paddle positions
        ball.reset(game.world.centerX, game.world.height - 45);
        paddle.reset(game.world.centerX, game.world.height - 20);
        paddleShadow.reset(game.world.centerX + shadowOffset, game.world.height - 20 + shadowOffset);
        // on user input remove health lost message and move the ball again
        game.input.onDown.addOnce(function() {
            hpLostInfo.visible = false;
            ball.body.velocity.set(400, -450);
        }, this);
    }
    // display game over screen and ability to restart
    else {
        hpInfo.setText("HEALTH: DEAD");
        gameOverText = game.add.text(game.world.centerX, game.world.centerY + 70, "GG! Try Not to Die Too Much Next Time!!!\nSCORE: " + score + "\n\n-CLICK TO RESTART-", { font: "26px Serif", fill: "#6d0715", align: "center"});
        gameOverText.anchor.set(0.5,0.5);
        game.input.onDown.add(function() {
            location.reload();
        }, this);
    }
}


// states for starting game in mouse mode
function startGameMouse() {
    mouseMode = true;
    // remove buttons and text
    startText.destroy();
    mouseButton.destroy();
    keyboardButton.destroy();
    // velocity of ball (x, y); negative y value so ball moves up at start
    ball.body.velocity.set(400, -450);
    paddle.x = game.world.centerX;
    paddleShadow.x = game.world.centerX + shadowOffset;
    start = true;
}


// states for starting game in keyboard mode
function startGameKeyboard() {
    keyboardMode = true;
    startText.destroy();
    mouseButton.destroy();
    keyboardButton.destroy();
    ball.body.velocity.set(400, -450);
    paddle.x = game.world.centerX;
    paddleShadow.x = game.world.centerX + shadowOffset;
    start = true;
}


// generate random number inclusively
function randomNumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}