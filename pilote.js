
var express = require('express');
var path = require('path');
var uuidv4 = require("uuid/v4");
var generator = require('generate-password');

var bodyParser = require('body-parser');

var dataSearchLayer = require('../Recherche/dataLayer.js');
var dataLogLayer = require('../logSILO/dataLayer.js');
var dataPlaylistLayer = require('../playlistSILO/dataLayer.js');
var dataUserLayer = require('../userSILO/dataLayer.js');

var app = express();
var port = 8095;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static(path.join(__dirname, 'public')));


app.use(function(req, res, next){
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');

    //Request methods you wish to allow
    res.setHeader("Access-Control-Allow-Methods", "POST");

    //Request headers you wish to allow
    res.setHeader("Access-Control-Allow-Headers", "X-requested-with,content-type");

    next();

});


/***
 * =====================================================================================
 * 
 *                                  USER SILO
 * 
 * =====================================================================================
 */

/**
 * ---------------------------------------------------- GET
 * 
 * Récupérer les Utilisateurs
 * 
 * SSI user_id est admin
 */
app.get('/api/admin/users/:user_id', function(req,res){
    console.log('lololololol');
    if(!req.params.user_id){
        res.send({
            success:false,
            errorSet:['USER_ID_NOT_PROVIDED']
        });
    }else{
        
        dataUserLayer.isAdmin(req.params.user_id, function(isAdmin){
            if(isAdmin){
                dataUserLayer.getAllUsers(function(data){
                    res.send(data);
                });
            }else{
                res.send({
                    success:false, 
                    errorSet:['USER_ID_NOT_ADMIN']
                })
            }
        });
    }
});

/**
 * ---------------------------------------------------- POST
 * 
 * Création du compte
 */
app.post('/api/users', function (req, res) {
    if(!req.body.firstname || !req.body.lastname || !req.body.email || !req.body.password){
        res.send({
            success:false,
            errorSet:['ONE_OR_MORE_FIELD_IS_EMPTY']
        });
    }else{
        var user = {
            firstname:req.body.firstname,
            lastname:req.body.lastname,
            email:req.body.email,
            password:req.body.password
        };


        dataUserLayer.addAccount(user, function(success, user_id){
            res.send({ success:success, user_id:user_id});
        });
    }
});

/**
 * ---------------------------------------------------- PUT
 * 
 * Modifie le mdp, 
 * 
 * SI password fourni, change le mdp,
 * SINON génère password et l'envoie par mail
 */
app.put('/api/users', function(req,res){
    if(!req.body.email){
        res.send({
            success:false,
            errorSet:['EMAIL_FIELD_IS_EMPTY']
        });
    }else{
        if(!req.body.password){
            //generate password
            password = generator.generate({
                length: 10,
                numbers: true
            });
        }else{
            password = req.body.password;
        }

        let data = {
            password: password,
            email: req.body.email
        }
        dataUserLayer.updatePassword(data, function(success){
            if(success){
                //send success
                res.send({
                    success:true
                });
            }else{
                res.send({
                    success:false,
                    errorSet:['EMAIL_INCORRECT']
                });
            }
        })
    }
});

/**
 * ---------------------------------------------------- DELETE
 * 
 * Supprime le compte associé au user_id
 */
app.delete('/api/users', function(req, res){
    if(!req.body.user_id){
        res.send({
            success: false,
            errorSet :['USER_ID_FIELD_IS_EMPTY']
        });
    }else{
        dataUserLayer.deleteAccount(req.body.user_id,function(success){
            if(success){
                res.send({success:success});
            }else{
                res.send({
                    success:success,
                    errorSet:['WRONG_USER_ID']
                });
            }
        });
    }
});

/**
 * ---------------------------------------------------- POST
 * 
 * Connecte l'utilisateur et renvoie son user_id
 * 
 */
app.post('/api/users/connect', function (req,res){
    if(!req.body.email || !req.body.password){
        res.send({
            success: false,
            errorSet:['ONE_OR_MORE_FIELD_IS_EMPTY']
        });
    }else{
        dataUserLayer.getUserId(req.body, function(data){
            if(data.success){
                res.send(data);
            }else{
                res.send({
                    success: false,
                    errorSet:['EMAIL_OR_PASSWORD_INCORRECT']
                });
            }
        })
    }
});

/**
 * ---------------------------------------------------- GET
 * 
 * Obtient le profil de l'utilisateur demandé
 */
app.get('/api/users/:user_id', function(req, res){
    if(!req.params.user_id){
        res.send({
            success: false,
            errorSet :['USER_ID_FIELD_IS_EMPTY']
        });
    }else{
        dataUserLayer.getUserObject(req.params.user_id,function(response){
            if(response.success){
                console.log('loooooool3');
                console.log(response)
                res.send(response.data[0]);
            }else{
                console.log('loooooool4');
                res.send({
                    success:response.success,
                    errorSet:['WRONG_USER_ID']
                });
            }
        });
    }
});

/**
 * ---------------------------------------------------- POST
 * 
 * Change la valeur demandée
 */
app.put('/api/users/:user_id', function(req, res){
    console.log("HEYYY")
    if(!req.params.user_id || !req.body.user_id || !req.body.value || !req.body.field){
        res.send({
            success: false,
            errorSet:['ONE_OR_MORE_FIELD_IS_EMPTY']
        });
    }else{
        if((req.body.field == 'firstname' || req.body.field == 'lastname' 
            || req.body.field == 'email' || req.body.field == 'password')
            && req.params.user_id == req.body.user_id){
            dataUserLayer.changeValue(req.params.user_id, req.body.field, req.body.value, function(success){
                if(success){
                    res.send({success: true});
                }else{
                    res.send({
                        success: false,
                        errorSet:['UNKNOWN_ERROR']
                    });
                }
            })
        }else if(req.body.field == 'active' || req.body.field == 'admin'){
            dataUserLayer.isAdmin(req.body.user_id, function(isAdmin){
                if(isAdmin){
                    dataUserLayer.changeValue(req.params.user_id, req.body.field, req.body.value, function(success){
                        if(success){
                            res.send({success: true});
                        }else{
                            res.send({
                                success: false,
                                errorSet:['UNKNOWN_ERROR']
                            });
                        }
                    });
                }else{
                    res.send({
                        success: false,
                        errorSet:['WRONG_USER_ID']
                    });
                }
            })
        }else{
            res.send({
                success: false,
                errorSet:['UNKNOWN_ERROR']
            });
        }
    }
});

/***
 * =====================================================================================
 * 
 *                                  PLAYLIST SILO
 * 
 * =====================================================================================
 */

/**
 * ---------------------------------------------------- GET
 * 
 * Obtient les playlist de l'utilisateur
 */
app.get('/api/playlist/:userId', function(req, res){
    if(!req.params.userId){
        res.send({
            success : false,
            errorSet:['NO_USER_ID']
        });
    }else{
        dataPlaylistLayer.getPlaylistsForUser(req.params.userId, function(data){
            res.send({
                success:true,
                data:data
            });
        });
    }
});

/**
 * ---------------------------------------------------- POST
 * 
 * Crée une playlist pour l'utilisateur
 */
app.post('/api/playlist', function(req, res){
    if(!req.body.user_id){
        res.send({
            success : false,
            errorSet:['NO_USER_ID']
        });
    }else if(!req.body.name){
        res.send({
            success : false,
            errorSet:['ONE_OR_MORE_FIELD_IS_EMPTY']
        });
    }else{
        let playlist = {
            name: req.body.name,
            user_id: req.body.user_id
        }
        dataPlaylistLayer.createPlaylist(playlist, function(data){
            res.send(data);
        });
    }
});

/**
 * ---------------------------------------------------- DELETE
 * 
 * Supprime une playist
 */
app.delete('/api/playlist', function(req, res){
    if(!req.body.user_id || !req.body.playlist_id){
        res.send({
            success: false,
            errorSet :['ONE_OR_MORE_FIELD_IS_EMPTY']
        });
    }else{
        let data = {
            playlist_id: req.body.playlist_id,
            user_id:req.body.user_id
        }
        dataPlaylistLayer.deletePlaylist(data,function(success){
            if(success){
                res.send({success:success});
            }else{
                res.send({
                    success:success,
                    errorSet:['WRONG_USER_ID_OR_PLAYLIST_ID']
                });
            }
        });
    }
});

/**
 * ---------------------------------------------------- GET
 * 
 * Obtient les vidéos de la playlist
 */
app.get('/api/:playlist_id/videos', function(req, res){


    if(!req.params.playlist_id){
        res.send({
            success : false,
            errorSet:['NO_PLAYLIST_ID']
        });
    }else{
        /////////////////////////////
        dataPlaylistLayer.getPlaylistVideos(req.params.playlist_id, function(data){
            res.send({
                success:true,
                data:data
            });
        });
    }
});

/**
 * ---------------------------------------------------- POST
 * 
 * Ajoute une video a la playlist
 */
app.post('/api/oo/:playlist_id/videos', function(req, res){
    console.log('OK')
    if(!req.params.playlist_id || !req.body.platform || !req.body.video_id){
        res.send({
            success : false,
            errorSet:['ONE_OR_MORE_FIELD_IS_EMPTY']
        });
    }else{

        let getObject = {
            platformId : req.body.platform,
            videoId : req.body.video_id
        }

        console.log(getObject)

        dataSearchLayer.getOne(getObject, function(data){
           
            let video = {
                platform: getObject.platformId,
                videoId : getObject.videoId,
                title : data.snippet.title,
                description: data.snippet.description,
            }

            dataPlaylistLayer.addVideo(req.params.playlist_id,video, function(success){
                res.send({success:success});
            });
        });


       /* let video = {
            platform: req.body.platform,
            video_id: req.body.video_id,
            title: req.body.title,
            uploader: req.body.uploader,
            duration: req.body.duration,
            thumbnail_URL: req.body.thumbnail_URL,
            description: req.body.description
        }
        dataPlaylistLayer.addVideo(req.params.playlist_id,video, function(success){
            res.send({success:success});
        });*/
    }
});

/**
 * ---------------------------------------------------- DELETE
 * 
 * Supprime une video
 */
app.delete('/api/:playlist_id/videos', function(req, res){
    if(!req.params.playlist_id || !req.body.video_id){
        res.send({
            success: false,
            errorSet :['ONE_OR_MORE_FIELD_IS_EMPTY']
        });
    }else{
        let data = {
            playlist_id: req.params.playlist_id,
            video_id:req.body.video_id
        }
        dataPlaylistLayer.deletevideo(data,function(success){
            if(success){
                res.send({success:success});
            }else{
                res.send({
                    success:success,
                    errorSet:['WRONG_VIDEO_ID_OR_PLAYLIST_ID']
                });
            }
        });
    }
});



/***
 * =====================================================================================
 * 
 *                                  LOGS SILO
 * 
 * =====================================================================================
 */

/**
 * ---------------------------------------------------- GET
 * 
 * Obtient l'historique des recherches de tous les utilisateurs
 */
app.get('/api/log/historique', function(req, res){
    if(!req.body.user_id){
        res.send({
            success : false,
            errorSet:['NO_USER_ID']
        });
    }else{
        dataUserLayer.isAdmin(req.body.user_id, function(admin){
            if(admin){
                dataLogLayer.getAllSearches(function(data){
                    res.send(data);
                });
            }else{
                res.send({
                    success : false,
                    errorSet:['NO_AUTHORIZATION']
                });
            }
        })
    }
});

/**
 * ---------------------------------------------------- GET
 * 
 * Obtient l'historique pour l'utilisateur
 */
app.get('/api/log/historique/:user_id', function(req, res){
    if(!req.params.user_id){
        res.send({
            success : false,
            errorSet:['NO_USER_ID']
        });
    }else{
        dataLogLayer.getAllSearchesForUser(req.params.user_id,function(data){
            res.send(data);
        });
    }
});

/**
 * ---------------------------------------------------- GET
 * 
 * Obtient les stats utilisateurs
 */
app.get('/api/log/users', function(req, res){
    if(!req.body.user_id){
        res.send({
            success: false,
            errorSet :['NO_USER_ID']
        });
    }else{
        dataUserLayer.isAdmin(req.body.user_id,function(admin){
            if(admin){
                var array = [];
                dataUserLayer.getAllUsers(function(data){
                    data.forEach(userObject => {
                        let userStatObject = {
                            user_id:userObject.user_id,
                            firstname: userObject.firstname,
                            lastname: userObject.lastname,
                            email: userObject.email,
                            is_active: userObject.is_active,
                            is_admin: userObject.is_admin
                        }
                        dataPlaylistLayer.getPlaylistCount(userObject.user_id, function(res1){
                            //add data.count dans le userStatObject
                            userStatObject.playlist_count = res1.count;
                            dataLogLayer.getStatsForUser(userObject.user_id, function(res2){
                                if(res2.success){
                                    userStatObject.playbacks_monthly_count = res2.playbacks_monthly_count;
                                    userStatObject.last_login = res2.last_login;
                                }else{
                                    userStatObject.playbacks_monthly_count = res2.playbacks_monthly_count;
                                    userStatObject.last_login = null;
                                }
                                array.push(userStatObject);
                            });
                        })
                    });
                    res.send({
                        success : true,
                        usersStats : array
                    });
                });
            }else{
                res.send({
                    success : false,
                    errorSet:['NO_AUTHORIZATION']
                });
            }
        })
    }
});


/***
 * =====================================================================================
 * 
 *                                  SEARCH
 * 
 * =====================================================================================
 */

app.get('/api/search/:query',function(req,res){
    if(!req.params.query){
        res.send({
            success : false,
            errorSet:['NO_QUERY']
        })
    }else{
        let searchObject = {
            query:req.params.query,
            platformId:null,
            skip:null,
            maxResults:10
        }
        dataSearchLayer.search(searchObject, function(data){
            res.send(data);
        })
    }
    
    /*
    let query = req.params.query;

    clientVimeo.request({
        method: 'GET',
        path: '/videos',
        query: {
          page: 1,
          per_page: 10,
          query: query,
          sort: 'relevant',
          direction: 'asc'
        }
      }, function (error, body, status_code, headers) {
        if (error) {
          console.log(error);
        }

        search(10,query, function(result){
            res.send({youtube:result,vimeo:body})
        })
      
        //res.send(body)
      })
    */
})

app.get('/api/video/:platformId/:videoId', function(req,res){
    
    if(!req.params.platformId || !req.params.videoId){
        res.send({
            success : false,
            errorSet:['ONE_OR_MORE_FIELD_IS_EMPTY']
        })
    }else{
        let getObject = {
            platformId : req.params.platformId,
            videoId : req.params.videoId
        }
        dataSearchLayer.getOne(getObject, function(data){
            res.send(data);
        });
    }
    /*
    let platformId = req.params.platformId;
    let videoId = req.params.videoId;

    if(platformId == 1){ 
     
        getOne(videoId, function(result){
            res.send(result.items[0])
        })
    }
    else{
        clientVimeo.request({
            method: 'GET',
            path: '/videos/'+videoId,
          }, function (error, body, status_code, headers) {
            if (error) {
              console.log(error);
            }

            res.send(body)
        })
    }

    */

}); 

////////////////
console.log("Server started port 8095");
if(process.env.PORT !== undefined){
    port= process.env.PORT;
}
app.listen(port);
