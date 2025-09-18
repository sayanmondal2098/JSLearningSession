window.addEventListener('load', function(){
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d');
    canvas.width = 1500;
    canvas.height = 500;

    class InputHAndler {
        constructor(game){
            this.game = game;
            window.addEventListener('keydown', e => {
                if (e.key === 'ArrowUp') {
                    this.game.keys.push(e.key)
                }
                console.log(this.game.keys);
                
                
            });

        }
    }

    class Projectile {

    }

    class Particle {

    }

    class Player {
        constructor(game){
            this.game = game;
            this.width = 120;
            this.height = 190;
            this.x = 20;
            this.y = 100;
            this.speedY = 1;
            // this.maxSpeed = 1;
        }

        update(){
            this.y += this.speedY;
        }

        draw(context){
            // context.fillStyle = 'black';
            context.fillRect(this.x, this.y, this.width, this.height);

        }


    }

    class Enemy {

    }

    class Layer {

    }

    class Background {

    }

    class UI {
        
    }

    class Game {
        constructor(width, height){
            this.width = width;
            this.height = height;
            this.player = new Player(this);
            this.input = new InputHAndler(this);
            this.keys = [];
        }

        update(){
            this.player.update();
        }
        
        draw(context){
            this.player.draw(context);
        }
        
    }

    const game = new Game(canvas.width, canvas.height);
    console.log(game);

    // animate loop

    function animate(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        game.update();
        game.draw(ctx);
        var frame = requestAnimationFrame(animate);
        
        // console.log(frame);
    }
    animate();



});