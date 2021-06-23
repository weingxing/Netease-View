from functools import update_wrapper

from flask import Flask, render_template, make_response
import requests
from flask_cors import *
import json
import server.service as service

app = Flask(__name__, root_path='./', template_folder='./template')
CORS(app, supports_credentials=True)

i = 0


# 获取热门评论
def get_comment():
    comment = dict()
    r = requests.get('https://api.4gml.com/NeteaseMusic?max=75&min=0').json()
    comment['artists'] = r['songname']
    comment['song'] = '《' + r['name'] + '》'
    comment['nickname'] = r['username']
    comment['content'] = str(r['content']).replace("\n", "")
    global i
    comment['code'] = i
    if i == 0:
        i = 1
    else:
        i = 0
    return comment


@app.route('/comment')
def comment():
    return json.dumps(get_comment())


@app.route('/emoji/<song_id>')
def emoji(song_id):
    return json.dumps(service.emoji_count(song_id))


@app.route('/age/<song_id>')
def user_age(song_id):
    return json.dumps(service.user_age(song_id))


@app.route('/vip/<song_id>')
def user_vip(song_id):
    return json.dumps(service.user_vip(song_id))


@app.route('/city/<song_id>')
def city(song_id):
    return json.dumps(service.user_city(song_id))


@app.route('/lyric_emotion/<song_id>')
def emotion(song_id):
    return json.dumps(service.lyric_emotion(song_id))


@app.route('/time/<song_id>')
def time(song_id):
    return json.dumps(service.comments_time(song_id))


@app.route('/songs')
def random_songs():
    return json.dumps(service.random_song(10))


def no_cache(f):
    def new_func(*args, **kwargs):
        resp = make_response(f(*args, **kwargs))
        resp.cache_control.no_cache = True
        return resp
    return update_wrapper(new_func, f)


@app.route('/')
@no_cache
def user_page():
    return render_template('index.html')


if __name__ == '__main__':
    app.run(debug=False)
