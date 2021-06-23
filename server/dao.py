import pymongo
import config
import re


def find_by_id(song_id):
    client = pymongo.MongoClient(config.mongodb_url)
    database = client[config.db_name]
    col = database[config.col]
    res = col.find_one({'song_id': int(song_id)})
    client.close()

    return res


def random_find(size):
    client = pymongo.MongoClient(config.mongodb_url)
    database = client[config.db_name]
    col = database[config.col]
    res = col.aggregate([{'$sample': {'size': size}}])
    client.close()
    return res


def duplicate(users):
    uid = dict()
    u = []
    for user in users:
        try:
            # 如果用户重复，不会抛出异常
            uid[user['user_id']]
        except KeyError as e:
            # 出现异常，表明尚未存在
            u.append(user)
            uid[user['user_id']] = 1
    return u


def remove_stop_words(f):
    try:
        stop_words = ['作词', '作曲', '编曲', 'Arranger', '录音', '混音', '人声',
                      'Vocal', '弦乐', 'Keyboard', '键盘', '编辑', '助理',
                      'Assistants', 'Mixing', 'Editing', 'Recording', '音乐',
                      '制作', 'Producer', '发行', 'produced', 'and', 'distributed']
        f = re.sub(r'[\d:.[\]]', '', f)
        for stop in stop_words:
            f = f.replace(stop, '')
        return f
    except:
        return ""


def get_data():
    client = pymongo.MongoClient(config.mongodb_url)
    db = client[config.db_name]
    col = db[config.col]
    x = list(col.find())
    client.close()
    comments = []
    users = []
    lyrics = {}
    artists = []
    for i in x:
        if i['lyric'] is not None:
            lyrics[i['artists'][0] + '-《' + i['name'] + '》'] = remove_stop_words(i['lyric'])
        for artist in i['artists']:
            artists.append(artist)
        for comment in i['comments']:
            try:
                users.append(comment['user'])
                del comment['user']
                comments.append(comment)
            except:
                pass
    return comments, duplicate(users), lyrics, artists
