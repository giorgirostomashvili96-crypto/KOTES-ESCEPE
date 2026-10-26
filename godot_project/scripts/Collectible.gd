extends Area2D
class_name Collectible

enum CollectibleType { COIN, MAGNET, SPEED, BONE, SHIELD }

@export var type: CollectibleType = CollectibleType.COIN
@export var value: int = 20
var anim_timer: float = 0.0
var base_y: float = 0.0

func _ready() -> void:
	base_y = position.y
	body_entered.connect(_on_body_entered)

func _process(dt: float) -> void:
	anim_timer += dt
	position.y = base_y + sin(anim_timer * 6.0) * 4.0
	queue_redraw()

func _on_body_entered(body: Node2D) -> void:
	if body is Player:
		var p := body as Player
		p.collected_item.emit(self)
		queue_free()

func _draw() -> void:
	match type:
		CollectibleType.COIN:
			# Toilet paper roll
			draw_rect(Rect2(-14, -14, 28, 28), Color("#FFFFFF"), true)
			draw_rect(Rect2(-14, -14, 28, 28), Color("#CBD5E1"), false, 1.5)
			# Cardboard core oval
			draw_circle(Vector2(0, -6), 5.0, Color("#78350F"))
			draw_circle(Vector2(0, -6), 2.5, Color("#1C1917"))
			# Golden collectible aura
			draw_arc(Vector2(0, 0), 18, 0, 2 * PI, 16, Color(0.98, 0.75, 0.14, 0.4), 1.5)
		CollectibleType.MAGNET:
			draw_circle(Vector2(0, 0), 18, Color(0.22, 0.74, 0.97, 0.4))
			var font = ThemeDB.fallback_font
			draw_string(font, Vector2(-8, 5), "🧲", HORIZONTAL_ALIGNMENT_CENTER, -1, 16)
		CollectibleType.SPEED:
			draw_circle(Vector2(0, 0), 18, Color(0.98, 0.75, 0.14, 0.4))
			var font = ThemeDB.fallback_font
			draw_string(font, Vector2(-8, 5), "⚡", HORIZONTAL_ALIGNMENT_CENTER, -1, 16)
		CollectibleType.BONE:
			draw_circle(Vector2(0, 0), 18, Color(0.9, 0.9, 0.9, 0.4))
			var font = ThemeDB.fallback_font
			draw_string(font, Vector2(-8, 5), "🦴", HORIZONTAL_ALIGNMENT_CENTER, -1, 16)
		CollectibleType.SHIELD:
			draw_circle(Vector2(0, 0), 18, Color(0.02, 0.71, 0.83, 0.4))
			var font = ThemeDB.fallback_font
			draw_string(font, Vector2(-8, 5), "🛡️", HORIZONTAL_ALIGNMENT_CENTER, -1, 16)
