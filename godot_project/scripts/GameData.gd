extends Node
class_name GameDataManager

# Singleton for persistent data and character configurations
var save_path := "user://kote_save.cfg"

var coins: int = 100 # 100 starter coins
var high_score: int = 0
var high_distance: int = 0
var selected_skin: String = "classic"
var unlocked_skins: Array[String] = ["classic"]
var sound_enabled: bool = true
var language: String = "ka"

# Skin definitions matching the web game 100%
var skins_catalog: Array[Dictionary] = [
	{
		"id": "classic",
		"name_ka": "კოტე (კლასიკური)",
		"name_en": "Kote (Classic)",
		"title_ka": "ორიგინალური მორბენალი",
		"price": 0,
		"badge": "⭐",
		"perk_ka": "ბალანსირებული სისწრაფე და ორმაგი ნახტომი",
		"color": Color("#18181B")
	},
	{
		"id": "new_year",
		"name_ka": "საახალწლო კოტე",
		"name_en": "Festive New Year Kote",
		"title_ka": "სადღესასწაულო განწყობა",
		"price": 50,
		"badge": "🎄",
		"perk_ka": "+50% საახალწლო ქოინების ბონუსი (+3 ქოინი)",
		"color": Color("#DC2626")
	},
	{
		"id": "halloween",
		"name_ka": "ჰელოუინის კოტე",
		"name_en": "Halloween Phantom Kote",
		"title_ka": "მისტიკური აურა",
		"price": 70,
		"badge": "🎃",
		"perk_ka": "მდევარი იწყებს +40 პიქსელით უფრო შორს",
		"color": Color("#3B0764")
	},
	{
		"id": "summer",
		"name_ka": "საზაფხულო კოტე",
		"name_en": "Batumi Summer Kote",
		"title_ka": "ზღვის ბრიზი და სისწრაფე",
		"price": 80,
		"badge": "🏖️",
		"perk_ka": "ჰავაური სტილი და სტარტის სპრინტ-აჩქარება",
		"color": Color("#06B6D4")
	},
	{
		"id": "chokha",
		"name_ka": "კოტე ჩოხაში",
		"name_en": "Georgian Chokha Kote",
		"title_ka": "კავკასიური შემართება",
		"price": 100,
		"badge": "⚔️",
		"perk_ka": "ვერცხლის მასრები და სასტარტო მაგნიტის აურა",
		"color": Color("#0F172A")
	},
	{
		"id": "cyberpunk",
		"name_ka": "კიბერპანკ 2099",
		"name_en": "Cyberpunk 2099 Kote",
		"title_ka": "ნეონის კიბერ-ჰუდი",
		"price": 120,
		"badge": "⚡",
		"perk_ka": "სამმაგი ნახტომი (TRIPLE JUMP - 3x)",
		"color": Color("#09090B")
	},
	{
		"id": "taxi",
		"name_ka": "თბილისელი ტაქსისტი",
		"name_en": "Tbilisi Taxi Driver",
		"title_ka": "გამოცდილი მძღოლი",
		"price": 90,
		"badge": "🚕",
		"perk_ka": "ტყავის ჟილეტი და მზა ძვალი მდევრის დასაბნევად",
		"color": Color("#78350F")
	},
	{
		"id": "svaneti",
		"name_ka": "სვანური ზამთარი",
		"name_en": "Svaneti Alpinist Kote",
		"title_ka": "მთის მყინვარული ფარი",
		"price": 110,
		"badge": "🏔️",
		"perk_ka": "იწყებს ყინულის დამცავი დამცავი ფარით",
		"color": Color("#EA580C")
	},
	{
		"id": "vip",
		"name_ka": "ოქროს კოტე (VIP)",
		"name_en": "Golden Millionaire VIP",
		"title_ka": "24K ოქროს ბზინვარება",
		"price": 150,
		"badge": "👑",
		"perk_ka": "ოქროს სმოკინგი და x2 ქოინების მულტიპლიკატორი (+4 ქოინი)",
		"color": Color("#FACC15")
	}
]

# Levels configuration
var levels_catalog: Array[Dictionary] = [
	{
		"level": 1,
		"name_ka": "უბნის ქუჩა",
		"name_en": "Neighborhood Street",
		"speed": 300.0,
		"target_dist": 450,
		"bg_color": Color("#1E1B4B")
	},
	{
		"level": 2,
		"name_ka": "ქალაქის სახურავები",
		"name_en": "Rooftop Rush",
		"speed": 360.0,
		"target_dist": 1100,
		"bg_color": Color("#312E81")
	},
	{
		"level": 3,
		"name_ka": "ძველი თბილისის ჩიხები",
		"name_en": "Old Tbilisi Alleys",
		"speed": 410.0,
		"target_dist": 2200,
		"bg_color": Color("#4C1D95")
	},
	{
		"level": 4,
		"name_ka": "სვანეთის კოშკების ციხე",
		"name_en": "Svaneti Towers Castle",
		"speed": 460.0,
		"target_dist": 99999,
		"bg_color": Color("#0F172A")
	}
]

func _ready() -> void:
	load_data()

func save_data() -> void:
	var cfg = ConfigFile.new()
	cfg.set_value("economy", "coins", coins)
	cfg.set_value("records", "high_score", high_score)
	cfg.set_value("records", "high_distance", high_distance)
	cfg.set_value("customization", "selected_skin", selected_skin)
	cfg.set_value("customization", "unlocked_skins", unlocked_skins)
	cfg.set_value("settings", "sound_enabled", sound_enabled)
	cfg.set_value("settings", "language", language)
	cfg.save(save_path)

func load_data() -> void:
	var cfg = ConfigFile.new()
	var err = cfg.load(save_path)
	if err == OK:
		coins = cfg.get_value("economy", "coins", 100)
		high_score = cfg.get_value("records", "high_score", 0)
		high_distance = cfg.get_value("records", "high_distance", 0)
		selected_skin = cfg.get_value("customization", "selected_skin", "classic")
		var loaded_skins = cfg.get_value("customization", "unlocked_skins", ["classic"])
		unlocked_skins.clear()
		for s in loaded_skins:
			unlocked_skins.append(str(s))
		if not unlocked_skins.has("classic"):
			unlocked_skins.append("classic")
		sound_enabled = cfg.get_value("settings", "sound_enabled", true)
		language = cfg.get_value("settings", "language", "ka")

func is_skin_unlocked(skin_id: String) -> bool:
	return unlocked_skins.has(skin_id) or skin_id == "classic"

func buy_skin(skin_id: String) -> bool:
	for char_info in skins_catalog:
		if char_info["id"] == skin_id:
			var price: int = char_info["price"]
			if coins >= price:
				coins -= price
				if not unlocked_skins.has(skin_id):
					unlocked_skins.append(skin_id)
				selected_skin = skin_id
				save_data()
				return true
	return false

func equip_skin(skin_id: String) -> void:
	if is_skin_unlocked(skin_id):
		selected_skin = skin_id
		save_data()
