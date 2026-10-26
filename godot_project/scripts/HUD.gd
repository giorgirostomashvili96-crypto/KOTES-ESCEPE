extends CanvasLayer
class_name HUD

signal jump_pressed
signal slide_pressed
signal trap_pressed
signal boost_pressed
signal restart_requested

# In-game HUD
@onready var score_label: Label = $TopBar/ScoreLabel
@onready var coins_label: Label = $TopBar/CoinsLabel
@onready var dist_label: Label = $TopBar/DistLabel
@onready var level_label: Label = $TopBar/LevelLabel
@onready var multiplier_label: Label = $TopBar/MultiplierLabel
@onready var fever_bar: ProgressBar = $TopBar/FeverBar
@onready var threat_warning: Label = $ThreatWarning
@onready var toast_label: Label = $ToastLabel

# Panels / Modals
@onready var title_panel: Control = $TitlePanel
@onready var game_over_panel: Control = $GameOverPanel
@onready var skin_shop_panel: Control = $SkinShopPanel
@onready var settings_panel: Control = $SettingsPanel
@onready var level_select_panel: Control = $LevelSelectPanel

var gdata: GameDataManager = null
var toast_timer: float = 0.0

func _ready() -> void:
	gdata = GameDataManager.new()
	gdata.load_data()

	if threat_warning:
		threat_warning.visible = false
	if toast_label:
		toast_label.visible = false
	if game_over_panel:
		game_over_panel.visible = false
	if skin_shop_panel:
		skin_shop_panel.visible = false
	if settings_panel:
		settings_panel.visible = false
	if level_select_panel:
		level_select_panel.visible = false

	# Title menu starts visible on first launch
	if title_panel:
		title_panel.visible = true

	# Connect skin cards
	var skin_ids = ["classic", "new_year", "halloween", "summer", "chokha", "cyberpunk", "taxi", "svaneti", "vip"]
	for i in range(skin_ids.size()):
		var btn = skin_shop_panel.get_node_or_null("SkinsScroll/SkinsGrid/SkinCard" + str(i + 1))
		if btn is Button:
			var sid = skin_ids[i]
			(btn as Button).pressed.connect(func(): on_skin_card_pressed(sid))

func _process(dt: float) -> void:
	if toast_timer > 0.0:
		toast_timer -= dt
		if toast_timer <= 0.0 and toast_label:
			toast_label.visible = false

func update_stats(score: int, coins: int, dist: int, mult: int, fever_pct: float, threat_dist: float, level_name: String) -> void:
	if score_label:
		score_label.text = "ქულა: " + str(score)
	if coins_label:
		coins_label.text = "🧻 " + str(coins)
	if dist_label:
		dist_label.text = str(dist) + " მ"
	if level_label:
		level_label.text = level_name
	if multiplier_label:
		multiplier_label.text = "x" + str(mult)
	if fever_bar:
		fever_bar.value = fever_pct

	if threat_warning:
		threat_warning.visible = threat_dist < 90.0
		if threat_warning.visible:
			threat_warning.text = "⚠️ მდევარი ახლოსაა! (" + str(int(threat_dist)) + "px)"

func show_toast(msg: String) -> void:
	if toast_label:
		toast_label.text = msg
		toast_label.visible = true
		toast_timer = 2.4

func show_level_up(lvl_name: String) -> void:
	show_toast("🚀 ახალი დონე: " + lvl_name + "!")

func show_game_over(final_score: int, final_dist: int, final_coins: int) -> void:
	if game_over_panel:
		game_over_panel.visible = true
		var stats_text = "საბოლოო ქულა: " + str(final_score) + "\nმანძილი: " + str(final_dist) + " მ\nქოინები: " + str(final_coins) + " 🧻"
		var lbl = game_over_panel.get_node_or_null("StatsLabel")
		if lbl is Label:
			(lbl as Label).text = stats_text

# Title Menu Navigation Handlers
func _on_start_game_pressed() -> void:
	if title_panel:
		title_panel.visible = false

func _on_open_skin_shop_pressed() -> void:
	if skin_shop_panel:
		skin_shop_panel.visible = true
		refresh_skin_shop()

func _on_close_skin_shop_pressed() -> void:
	if skin_shop_panel:
		skin_shop_panel.visible = false

func _on_open_settings_pressed() -> void:
	if settings_panel:
		settings_panel.visible = true

func _on_close_settings_pressed() -> void:
	if settings_panel:
		settings_panel.visible = false

func _on_open_level_select_pressed() -> void:
	if level_select_panel:
		level_select_panel.visible = true

func _on_close_level_select_pressed() -> void:
	if level_select_panel:
		level_select_panel.visible = false

func refresh_skin_shop() -> void:
	gdata.load_data()
	var coins_display = skin_shop_panel.get_node_or_null("Header/CoinsDisplay")
	if coins_display is Label:
		(coins_display as Label).text = "🧻 თქვენი ბალანსი: " + str(gdata.coins) + " ქოინი"

	for i in range(gdata.skins_catalog.size()):
		var cinfo = gdata.skins_catalog[i]
		var btn = skin_shop_panel.get_node_or_null("SkinsScroll/SkinsGrid/SkinCard" + str(i + 1))
		if btn is Button:
			var sid: String = cinfo["id"]
			var bname: String = cinfo["badge"] + " " + cinfo["name_ka"] + " (" + str(cinfo["price"]) + " 🧻)\n" + cinfo["perk_ka"] + "\n"
			if gdata.selected_skin == sid:
				bname += "▶ [არჩეულია ✓]"
			elif gdata.is_skin_unlocked(sid):
				bname += "[არჩევა]"
			else:
				bname += "[ყიდვა - " + str(cinfo["price"]) + " 🧻]"
			(btn as Button).text = bname

func on_skin_card_pressed(sid: String) -> void:
	if gdata.is_skin_unlocked(sid):
		_on_skin_equip_clicked(sid)
	else:
		_on_skin_buy_clicked(sid)

func _on_skin_buy_clicked(skin_id: String) -> void:
	var success = gdata.buy_skin(skin_id)
	if success:
		show_toast("🎉 გილოცავთ! სკინი წარმატებით იყიდეთ!")
		refresh_skin_shop()
	else:
		show_toast("❌ ქოინები არ გყოფნის! ითამაშე და შეაგროვე!")

func _on_skin_equip_clicked(skin_id: String) -> void:
	gdata.equip_skin(skin_id)
	show_toast("✓ სკინი ჩაცმულია!")
	refresh_skin_shop()

# Mobile On-Screen Controls
func _on_jump_button_down() -> void:
	jump_pressed.emit()
	Input.action_press("jump")

func _on_jump_button_up() -> void:
	Input.action_release("jump")

func _on_slide_button_down() -> void:
	slide_pressed.emit()
	Input.action_press("slide")

func _on_slide_button_up() -> void:
	Input.action_release("slide")

func _on_trap_button_down() -> void:
	trap_pressed.emit()
	Input.action_press("trap")

func _on_boost_button_down() -> void:
	boost_pressed.emit()
	Input.action_press("boost")

func _on_restart_button_pressed() -> void:
	restart_requested.emit()
